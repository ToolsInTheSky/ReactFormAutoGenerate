using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ReactFormAutoGenerate.Server.Entities;

public class Product
{
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;

    [Required]
    public int CategoryId { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [ForeignKey("CategoryId")]
    [System.Text.Json.Serialization.JsonIgnore]
    public Category? Category { get; set; }
}
