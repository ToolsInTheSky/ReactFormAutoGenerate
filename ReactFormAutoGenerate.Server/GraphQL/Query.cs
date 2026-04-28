using HotChocolate;
using HotChocolate.Data;
using HotChocolate.Types;
using Microsoft.EntityFrameworkCore;
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

    [UseProjection]
    public Task<Category?> GetCategoryAsync([ID] int id, AppDbContext context) =>
        context.Categories.FirstOrDefaultAsync(c => c.Id == id);

    [UseOffsetPaging(IncludeTotalCount = true)]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Product> GetProducts(AppDbContext context) =>
        context.Products;

    [UseProjection]
    public Task<Product?> GetProductAsync([ID] int id, AppDbContext context) =>
        context.Products.FirstOrDefaultAsync(p => p.Id == id);

    [UseOffsetPaging(IncludeTotalCount = true)]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<InventoryItem> GetInventoryItems(AppDbContext context) =>
        context.InventoryItems;

    [UseProjection]
    public Task<InventoryItem?> GetInventoryItemAsync([ID] int id, AppDbContext context) =>
        context.InventoryItems.FirstOrDefaultAsync(i => i.Id == id);

    [UseProjection]
    public async Task<ProductLog?> GetProductLogAsync([GraphQLType(typeof(IdType))] string id, AppDbContext context)
    {
        var parts = id.Split('|');
        if (parts.Length < 3) return null;

        if (!int.TryParse(parts[0], out int productId)) return null;
        string activity = parts[1];
        if (!DateTime.TryParse(parts[2], out DateTime logDate)) return null;
        
        // Ensure UTC kind for PostgreSQL
        logDate = DateTime.SpecifyKind(logDate, DateTimeKind.Utc);
        
        string performedBy = parts.Length > 3 ? parts[3] : string.Empty;

        // Find by composite key components
        return await context.ProductLogs.FirstOrDefaultAsync(p =>
            p.ProductId == productId &&
            p.Activity == activity &&
            p.LogDate == logDate &&
            (p.PerformedBy ?? string.Empty) == (performedBy ?? string.Empty));
    }

    [UseOffsetPaging(IncludeTotalCount = true)]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<ProductLog> GetProductLogs(AppDbContext context) =>
        context.ProductLogs;

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
        
        return schema.ToJson();
    }
}
