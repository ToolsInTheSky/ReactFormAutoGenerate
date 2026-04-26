using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactFormAutoGenerate.Server.Data;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryItemsController : ControllerBase
{
    private readonly AppDbContext _context;

    public InventoryItemsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InventoryItem>>> GetInventoryItems()
    {
        return await _context.InventoryItems.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<InventoryItem>> GetInventoryItem(int id)
    {
        var item = await _context.InventoryItems.FindAsync(id);
        if (item == null) return NotFound();
        return item;
    }

    [HttpPost]
    public async Task<ActionResult<InventoryItem>> PostInventoryItem(InventoryItem item)
    {
        item.UpdateDate = DateTime.UtcNow;
        _context.InventoryItems.Add(item);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetInventoryItem), new { id = item.Id }, item);
    }

    [HttpPut("{id}")]
    [HttpPatch("{id}")]
    public async Task<IActionResult> PutInventoryItem(int id, InventoryItem item)
    {
        if (id != item.Id) return BadRequest();
        item.UpdateDate = DateTime.UtcNow;
        _context.Entry(item).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteInventoryItem(int id)
    {
        var item = await _context.InventoryItems.FindAsync(id);
        if (item == null) return NotFound();
        _context.InventoryItems.Remove(item);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
