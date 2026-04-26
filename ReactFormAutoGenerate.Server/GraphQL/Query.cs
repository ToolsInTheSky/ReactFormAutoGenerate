using HotChocolate;
using HotChocolate.Data;
using HotChocolate.Types;
using NJsonSchema;
using ReactFormAutoGenerate.Server.Data;
using ReactFormAutoGenerate.Server.Entities;
using ReactFormAutoGenerate.Server.Controllers;

namespace ReactFormAutoGenerate.Server.GraphQL;

public class Query
{
    [UseOffsetPaging(IncludeTotalCount = true)]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Category> GetCategories(AppDbContext context) =>
        context.Categories;

    [UseOffsetPaging(IncludeTotalCount = true)]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Product> GetProducts(AppDbContext context) =>
        context.Products;

    [UseOffsetPaging(IncludeTotalCount = true)]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<InventoryItem> GetInventoryItems(AppDbContext context) =>
        context.InventoryItems;

    /// <summary>
    /// Returns the JSON Schema for a given entity type using NJsonSchema.
    /// protocol parameter is now ignored as we use a unified schema.
    /// </summary>
    public string GetJsonSchema(string entityName, string protocol)
    {
        var type = typeof(Category).Assembly.GetTypes().FirstOrDefault(t => 
            t.Namespace == "ReactFormAutoGenerate.Server.Entities" && 
            string.Equals(t.Name, entityName, StringComparison.OrdinalIgnoreCase));

        if (type == null) return "{}";

        var schema = JsonSchema.FromType(type, SchemaController.Settings);
        SchemaController.ProcessCustomMetadata(schema, type);
        
        return schema.ToJson();
    }
}
