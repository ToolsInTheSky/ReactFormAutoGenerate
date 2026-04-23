using System.ComponentModel.DataAnnotations;

namespace ReactFormAutoGenerate.Server.Entities;

public class Category
{
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [System.Text.Json.Serialization.JsonIgnore]
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
