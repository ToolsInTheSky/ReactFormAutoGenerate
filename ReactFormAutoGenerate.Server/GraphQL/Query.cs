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
        var (productId, activity, logDate, performedBy) = ParseProductLogId(id);

        var minDate = logDate.AddMilliseconds(-1);
        var maxDate = logDate.AddMilliseconds(1);

        // Find by composite key components
        return await context.ProductLogs.FirstOrDefaultAsync(p =>
            p.ProductId == productId &&
            p.Activity == activity &&
            p.LogDate >= minDate &&
            p.LogDate <= maxDate &&
            p.PerformedBy == performedBy);
    }

    [UseOffsetPaging(IncludeTotalCount = true)]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<ProductLog> GetProductLogs(AppDbContext context) =>
        context.ProductLogs;

    private static (int productId, string activity, DateTime logDate, string performedBy) ParseProductLogId(string id)
    {
        var tokens = id.Split('|').Select(t => t.Trim('\"', ' ')).ToList();
        if (tokens.Count < 3) throw new Exception("Invalid ProductLog ID format");

        int productId = int.Parse(tokens[0]);
        string activity = tokens[1];
        DateTime logDate = DateTime.Parse(tokens[2], null, System.Globalization.DateTimeStyles.RoundtripKind);
        logDate = DateTime.SpecifyKind(logDate, DateTimeKind.Utc);
        string performedBy = tokens.Count > 3 ? tokens[3] : "";

        return (productId, activity, logDate, performedBy);
    }

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
