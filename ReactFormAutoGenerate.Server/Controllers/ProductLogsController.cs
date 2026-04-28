using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactFormAutoGenerate.Server.Data;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductLogsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductLog>>> GetProductLogs()
    {
        return await _context.ProductLogs.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductLog>> GetProductLog(string id)
    {
        var parts = id.Split('|');
        if (parts.Length < 3) return BadRequest("Invalid composite ID format");

        if (!int.TryParse(parts[0], out int productId)) return BadRequest("Invalid ProductId");
        string activity = parts[1];
        if (!DateTime.TryParse(parts[2], out DateTime logDate)) return BadRequest("Invalid LogDate");
        
        // Ensure UTC kind for PostgreSQL
        logDate = DateTime.SpecifyKind(logDate, DateTimeKind.Utc);
        
        string performedBy = parts.Length > 3 ? parts[3] : string.Empty;

        var log = await _context.ProductLogs.FirstOrDefaultAsync(p =>
            p.ProductId == productId &&
            p.Activity == activity &&
            p.LogDate == logDate &&
            (p.PerformedBy ?? string.Empty) == (performedBy ?? string.Empty));

        if (log == null) return NotFound();

        return log;
    }
}
