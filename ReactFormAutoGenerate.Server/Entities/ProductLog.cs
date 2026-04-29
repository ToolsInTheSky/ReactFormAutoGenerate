using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ReactFormAutoGenerate.Server.Entities;

/// <summary>
/// A keyless entity example that logs product activities.
/// This table does not have a Primary Key or Identity column.
/// </summary>
public class ProductLog
{
    [Required]
    public int ProductId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Activity { get; set; } = string.Empty;

    public DateTime LogDate { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(100)]
    public string PerformedBy { get; set; } = string.Empty;
}
