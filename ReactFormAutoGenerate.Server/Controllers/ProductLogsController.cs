using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactFormAutoGenerate.Server.Data;
using ReactFormAutoGenerate.Server.Entities;


namespace ReactFormAutoGenerate.Server.Controllers;

[ApiController]
[Route("api/productlogs")]
public class ProductLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductLogsController(AppDbContext context)
    {
        _context = context;
    }

    // -------------------------------------------------------------------------
    // x-id header format (matches schemaHeaders.js isUnquotedType logic):
    //   ProductId|"Activity"|"LogDate"|"PerformedBy"
    //   e.g.  42|"Shipped"|"2025-01-15T10:00:00.000Z"|"Alice"
    // x-identity-fields order: ProductId, Activity, LogDate, PerformedBy
    // -------------------------------------------------------------------------

    /// <summary>
    /// Splits an x-id header value into its constituent typed parts.
    /// Quoted segments have surrounding double-quotes stripped.
    /// </summary>
    private static (bool ok, string error, int productId, string activity, DateTime logDate, string performedBy)
        ParseXId(string xId)
    {
        // Tokenise by '|' but respect quoted segments that may contain pipes
        var tokens = TokeniseXId(xId);

        if (tokens.Count < 3)
            return (false, $"Expected at least 3 fields in x-id, got {tokens.Count}", 0, "", default, "");

        if (!int.TryParse(tokens[0], out int productId))
            return (false, $"Invalid ProductId '{tokens[0]}'", 0, "", default, "");

        string activity = tokens[1];

        if (!DateTime.TryParse(tokens[2], null, System.Globalization.DateTimeStyles.RoundtripKind, out DateTime logDate))
            return (false, $"Invalid LogDate '{tokens[2]}'", 0, "", default, "");

        // Ensure UTC for comparison with PostgreSQL timestamptz
        if (logDate.Kind != DateTimeKind.Utc)
        {
            logDate = DateTime.SpecifyKind(logDate, DateTimeKind.Utc);
        }

        string performedBy = tokens.Count > 3 ? tokens[3] : "";

        return (true, string.Empty, productId, activity, logDate, performedBy);
    }

    /// <summary>
    /// Returns true if any of the composite key property values differ between
    /// the existing tracked entity and the updated entity, using EF Core's model
    /// metadata so this method works generically for any keyless table.
    /// </summary>
    private bool KeyChanged<T>(T existing, T updated) where T : class
    {
        var keyProps = _context.Model
            .FindEntityType(typeof(T))!
            .FindPrimaryKey()!
            .Properties;

        return keyProps.Any(p =>
            !Equals(p.PropertyInfo!.GetValue(existing),
                    p.PropertyInfo!.GetValue(updated)));
    }

    /// <summary>
    /// Splits the x-id string on '|' boundaries, stripping outer quotes from quoted tokens.
    /// Handles ISO date-time strings that contain no pipes (safe simple split).
    /// </summary>
    private static List<string> TokeniseXId(string xId)
    {
        var result = new List<string>();
        foreach (var raw in xId.Split('|'))
        {
            var t = raw.Trim();
            // Strip surrounding double-quotes added by schemaHeaders.js
            if (t.StartsWith('"') && t.EndsWith('"') && t.Length >= 2)
                t = t[1..^1];
            result.Add(t);
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // GET /api/productlogs/all
    // -------------------------------------------------------------------------
    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<ProductLog>>> GetProductLogs()
    {
        return await _context.ProductLogs.ToListAsync();
    }

    [HttpGet("page")]
    public async Task<ActionResult<object>> GetPagedProductLogs([FromQuery] int skip = 0, [FromQuery] int take = 10)
    {
        var totalCount = await _context.ProductLogs.CountAsync();
        var items = await _context.ProductLogs
            .OrderByDescending(p => p.LogDate)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return new { items, totalCount };
    }

    // -------------------------------------------------------------------------
    // GET /api/productlogs          (x-id header required)
    // -------------------------------------------------------------------------
    [HttpGet]
    public async Task<ActionResult<ProductLog>> GetProductLog(
        [FromHeader(Name = "x-id")] string xId)
    {
        var (ok, error, productId, activity, logDate, performedBy) = ParseXId(xId);
        if (!ok) return BadRequest(error);

        // Use a small 1ms window for DateTime comparison to handle precision issues
        var minDate = logDate.AddMilliseconds(-1);
        var maxDate = logDate.AddMilliseconds(1);

        var log = await _context.ProductLogs.FirstOrDefaultAsync(p =>
            p.ProductId == productId &&
            p.Activity == activity &&
            p.LogDate >= minDate &&
            p.LogDate <= maxDate &&
            p.PerformedBy == performedBy);

        if (log == null) return NotFound();
        return log;
    }

    // -------------------------------------------------------------------------
    // POST /api/productlogs         (body: ProductLog JSON)
    // -------------------------------------------------------------------------
    [HttpPost]
    public async Task<ActionResult<ProductLog>> PostProductLog(ProductLog productLog)
    {
        // Normalise LogDate to UTC for PostgreSQL
        productLog.LogDate = DateTime.SpecifyKind(productLog.LogDate, DateTimeKind.Utc);

        // Check for duplicate composite key (also with tolerance)
        var minDate = productLog.LogDate.AddMilliseconds(-1);
        var maxDate = productLog.LogDate.AddMilliseconds(1);
        
        bool exists = await _context.ProductLogs.AnyAsync(p =>
            p.ProductId == productLog.ProductId &&
            p.Activity == productLog.Activity &&
            p.LogDate >= minDate &&
            p.LogDate <= maxDate &&
            p.PerformedBy == productLog.PerformedBy);

        if (exists)
            return Conflict("A ProductLog record with the same composite key already exists.");

        _context.ProductLogs.Add(productLog);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProductLog), null, productLog);
    }

    // -------------------------------------------------------------------------
    // PUT / PATCH /api/productlogs  (x-id header = original key, body = updated record)
    // Because every field is part of the composite key, an "update" is
    // implemented as delete-old + insert-new inside a single transaction.
    // -------------------------------------------------------------------------
    [HttpPut]
    [HttpPatch]
    public async Task<IActionResult> PutProductLog(
        [FromHeader(Name = "x-id")] string xId,
        ProductLog updated)
    {
        var (ok, error, productId, activity, logDate, performedBy) = ParseXId(xId);
        if (!ok) return BadRequest(error);

        // Normalise incoming LogDate to UTC
        updated.LogDate = DateTime.SpecifyKind(updated.LogDate, DateTimeKind.Utc);

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Find the original record by parsed composite key (with tolerance)
            var minDate = logDate.AddMilliseconds(-1);
            var maxDate = logDate.AddMilliseconds(1);

            var existing = await _context.ProductLogs.FirstOrDefaultAsync(p =>
                p.ProductId == productId &&
                p.Activity == activity &&
                p.LogDate >= minDate &&
                p.LogDate <= maxDate &&
                p.PerformedBy == performedBy);

            if (existing == null)
            {
                await transaction.RollbackAsync();
                return NotFound();
            }

            // If any composite key field changed we must delete + re-insert
            bool keyChanged = KeyChanged(existing, updated);

            if (keyChanged)
            {
                // Remove only the single tracked instance found above (not a bulk delete)
                // so that other rows sharing the same composite key values are untouched.
                _context.ProductLogs.Remove(existing);
                await _context.SaveChangesAsync();  // flush delete first
                _context.ProductLogs.Add(updated);
                await _context.SaveChangesAsync();  // flush insert
            }
            else
            {
                // Key unchanged — update any non-key columns in place.
                _context.Entry(existing).CurrentValues.SetValues(updated);
                await _context.SaveChangesAsync();
            }

            await transaction.CommitAsync();

            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // -------------------------------------------------------------------------
    // DELETE /api/productlogs       (x-id header required)
    // -------------------------------------------------------------------------
    [HttpDelete]
    public async Task<IActionResult> DeleteProductLog(
        [FromHeader(Name = "x-id")] string xId)
    {
        var (ok, error, productId, activity, logDate, performedBy) = ParseXId(xId);
        if (!ok) return BadRequest(error);

        // Find the record with tolerance
        var minDate = logDate.AddMilliseconds(-1);
        var maxDate = logDate.AddMilliseconds(1);

        var log = await _context.ProductLogs.FirstOrDefaultAsync(p =>
            p.ProductId == productId &&
            p.Activity == activity &&
            p.LogDate >= minDate &&
            p.LogDate <= maxDate &&
            p.PerformedBy == performedBy);

        if (log == null) return NotFound();

        _context.ProductLogs.Remove(log);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
