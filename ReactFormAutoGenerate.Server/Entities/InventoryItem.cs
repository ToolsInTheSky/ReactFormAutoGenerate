using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ReactFormAutoGenerate.Server.Entities;

public class InventoryItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ProductId { get; set; }

    [Required]
    public int StockQuantity { get; set; }

    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;

    [Column(TypeName = "text")]
    public string? Note { get; set; }

    [ForeignKey("ProductId")]
    [System.Text.Json.Serialization.JsonIgnore]
    public Product? Product { get; set; }
}
