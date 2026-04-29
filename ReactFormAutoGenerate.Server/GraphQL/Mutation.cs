using HotChocolate;
using HotChocolate.Data;
using Microsoft.EntityFrameworkCore;
using ReactFormAutoGenerate.Server.Data;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.GraphQL;

public class Mutation
{
    // --- Category Mutations ---

    public record CreateCategoryInput(string Name);
    public record CreateOneCategoryInput(CreateCategoryInput Category);

    public async Task<Category> CreateOneCategoryAsync(
        CreateOneCategoryInput input, [Service] AppDbContext context)
    {
        var category = new Category { Name = input.Category.Name };
        context.Categories.Add(category);
        await context.SaveChangesAsync();
        return category;
    }

    public record UpdateCategoryInput(string Name, bool? IsUse);
    public record UpdateOneCategoryInput([ID] int Id, UpdateCategoryInput Update);

    public async Task<Category> UpdateOneCategoryAsync(
        UpdateOneCategoryInput input, [Service] AppDbContext context)
    {
        var category = await context.Categories.FindAsync(input.Id);
        if (category == null) throw new Exception("Category not found");
        
        category.Name = input.Update.Name;
        if (input.Update.IsUse.HasValue) category.IsUse = input.Update.IsUse.Value;
        
        await context.SaveChangesAsync();
        return category;
    }

    public record DeleteOneCategoryInput([ID] int Id);

    public async Task<Category> DeleteOneCategoryAsync(
        DeleteOneCategoryInput input, [Service] AppDbContext context)
    {
        var category = await context.Categories.FindAsync(input.Id);
        if (category == null) throw new Exception("Category not found");
        context.Categories.Remove(category);
        await context.SaveChangesAsync();
        return category;
    }

    // --- Product Mutations ---

    public record CreateProductInput(string Name, decimal Price, int CategoryId, string? Description, DateTime? UpdateDate);
    public record CreateOneProductInput(CreateProductInput Product);

    public async Task<Product> CreateOneProductAsync(
        CreateOneProductInput input, [Service] AppDbContext context)
    {
        var product = new Product 
        { 
            Name = input.Product.Name, 
            Price = input.Product.Price, 
            CategoryId = input.Product.CategoryId,
            Description = input.Product.Description,
            UpdateDate = input.Product.UpdateDate ?? DateTime.UtcNow
        };
        context.Products.Add(product);
        await context.SaveChangesAsync();
        return product;
    }

    public record UpdateProductInput(string Name, decimal Price, int CategoryId, string? Description, DateTime? UpdateDate);
    public record UpdateOneProductInput([ID] int Id, UpdateProductInput Update);

    public async Task<Product> UpdateOneProductAsync(
        UpdateOneProductInput input, [Service] AppDbContext context)
    {
        var product = await context.Products.FindAsync(input.Id);
        if (product == null) throw new Exception("Product not found");
        
        product.Name = input.Update.Name;
        product.Price = input.Update.Price;
        product.CategoryId = input.Update.CategoryId;
        product.Description = input.Update.Description;
        product.UpdateDate = input.Update.UpdateDate ?? DateTime.UtcNow;
        
        await context.SaveChangesAsync();
        return product;
    }

    public record DeleteOneProductInput([ID] int Id);

    public async Task<Product> DeleteOneProductAsync(
        DeleteOneProductInput input, [Service] AppDbContext context)
    {
        var product = await context.Products.FindAsync(input.Id);
        if (product == null) throw new Exception("Product not found");
        context.Products.Remove(product);
        await context.SaveChangesAsync();
        return product;
    }

    // --- InventoryItem Mutations ---

    public record CreateInventoryItemInput(int ProductId, int StockQuantity, string? Note, DateTime? UpdateDate);
    public record CreateOneInventoryItemInput(CreateInventoryItemInput InventoryItem);

    public async Task<InventoryItem> CreateOneInventoryItemAsync(
        CreateOneInventoryItemInput input, [Service] AppDbContext context)
    {
        var item = new InventoryItem 
        { 
            ProductId = input.InventoryItem.ProductId, 
            StockQuantity = input.InventoryItem.StockQuantity, 
            Note = input.InventoryItem.Note,
            UpdateDate = input.InventoryItem.UpdateDate ?? DateTime.UtcNow 
        };
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();
        return item;
    }

    public record UpdateInventoryItemInput(int ProductId, int StockQuantity, string? Note, DateTime? UpdateDate);
    public record UpdateOneInventoryItemInput([ID] int Id, UpdateInventoryItemInput Update);

    public async Task<InventoryItem> UpdateOneInventoryItemAsync(
        UpdateOneInventoryItemInput input, [Service] AppDbContext context)
    {
        var item = await context.InventoryItems.FindAsync(input.Id);
        if (item == null) throw new Exception("Inventory item not found");
        
        item.ProductId = input.Update.ProductId;
        item.StockQuantity = input.Update.StockQuantity;
        item.Note = input.Update.Note;
        item.UpdateDate = input.Update.UpdateDate ?? DateTime.UtcNow;
        
        await context.SaveChangesAsync();
        return item;
    }

    public record DeleteOneInventoryItemInput([ID] int Id);

    public async Task<InventoryItem> DeleteOneInventoryItemAsync(
        DeleteOneInventoryItemInput input, [Service] AppDbContext context)
    {
        var item = await context.InventoryItems.FindAsync(input.Id);
        if (item == null) throw new Exception("Inventory item not found");
        context.InventoryItems.Remove(item);
        await context.SaveChangesAsync();
        return item;
    }

    // --- ProductLog Mutations (Keyless) ---

    public record CreateProductLogInput(int ProductId, string Activity, string PerformedBy, DateTime? LogDate);
    public record CreateOneProductLogInput(CreateProductLogInput ProductLog);

    public async Task<ProductLog> CreateOneProductLogAsync(
        CreateOneProductLogInput input, [Service] IDbContextFactory<AppDbContext> contextFactory)
    {
        using var context = contextFactory.CreateDbContext();
        var log = new ProductLog 
        { 
            ProductId = input.ProductLog.ProductId, 
            Activity = input.ProductLog.Activity, 
            PerformedBy = input.ProductLog.PerformedBy,
            LogDate = DateTime.SpecifyKind(input.ProductLog.LogDate ?? DateTime.UtcNow, DateTimeKind.Utc)
        };
        context.ProductLogs.Add(log);
        await context.SaveChangesAsync();
        return log;
    }

    public record UpdateOneProductLogInput(string Id, CreateProductLogInput Update);

    public async Task<ProductLog> UpdateOneProductLogAsync(
        UpdateOneProductLogInput input, [Service] IDbContextFactory<AppDbContext> contextFactory)
    {
        var (productId, activity, logDate, performedBy) = ParseProductLogId(input.Id);
        using var context = contextFactory.CreateDbContext();

        var minDate = logDate.AddMilliseconds(-1);
        var maxDate = logDate.AddMilliseconds(1);

        var existing = await context.ProductLogs.FirstOrDefaultAsync(p =>
            p.ProductId == productId &&
            p.Activity == activity &&
            p.LogDate >= minDate &&
            p.LogDate <= maxDate &&
            p.PerformedBy == performedBy);

        if (existing == null) throw new Exception("ProductLog not found");

        // Remove and re-add because it's all key fields
        context.ProductLogs.Remove(existing);
        var updated = new ProductLog
        {
            ProductId = input.Update.ProductId,
            Activity = input.Update.Activity,
            PerformedBy = input.Update.PerformedBy,
            LogDate = DateTime.SpecifyKind(input.Update.LogDate ?? DateTime.UtcNow, DateTimeKind.Utc)
        };
        context.ProductLogs.Add(updated);
        await context.SaveChangesAsync();
        return updated;
    }

    public record DeleteOneProductLogInput(string Id);

    public async Task<ProductLog> DeleteOneProductLogAsync(
        DeleteOneProductLogInput input, [Service] IDbContextFactory<AppDbContext> contextFactory)
    {
        var (productId, activity, logDate, performedBy) = ParseProductLogId(input.Id);
        using var context = contextFactory.CreateDbContext();

        var minDate = logDate.AddMilliseconds(-1);
        var maxDate = logDate.AddMilliseconds(1);

        var log = await context.ProductLogs.FirstOrDefaultAsync(p =>
            p.ProductId == productId &&
            p.Activity == activity &&
            p.LogDate >= minDate &&
            p.LogDate <= maxDate &&
            p.PerformedBy == performedBy);

        if (log == null) throw new Exception("ProductLog not found");

        context.ProductLogs.Remove(log);
        await context.SaveChangesAsync();
        return log;
    }

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
}
