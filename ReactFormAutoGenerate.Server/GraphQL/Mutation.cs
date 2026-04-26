using HotChocolate;
using HotChocolate.Data;
using ReactFormAutoGenerate.Server.Data;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.GraphQL;

public class Mutation
{
    public async Task<Category> CreateCategoryAsync(string name, AppDbContext context)
    {
        var category = new Category { Name = name };
        context.Categories.Add(category);
        await context.SaveChangesAsync();
        return category;
    }

    public async Task<Category> UpdateCategoryAsync(int id, string name, AppDbContext context)
    {
        var category = await context.Categories.FindAsync(id);
        if (category == null) throw new Exception("Category not found");
        category.Name = name;
        await context.SaveChangesAsync();
        return category;
    }

    public async Task<Product> CreateProductAsync(
        string name, decimal price, int categoryId, AppDbContext context)
    {
        var product = new Product { Name = name, Price = price, CategoryId = categoryId };
        context.Products.Add(product);
        await context.SaveChangesAsync();
        return product;
    }

    public async Task<Product> UpdateProductAsync(
        int id, string name, decimal price, int categoryId, AppDbContext context)
    {
        var product = await context.Products.FindAsync(id);
        if (product == null) throw new Exception("Product not found");
        product.Name = name;
        product.Price = price;
        product.CategoryId = categoryId;
        await context.SaveChangesAsync();
        return product;
    }

    public async Task<bool> DeleteProductAsync(int id, AppDbContext context)
    {
        var product = await context.Products.FindAsync(id);
        if (product == null) return false;
        context.Products.Remove(product);
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteCategoryAsync(int id, AppDbContext context)
    {
        var category = await context.Categories.FindAsync(id);
        if (category == null) return false;
        context.Categories.Remove(category);
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<InventoryItem> CreateInventoryItemAsync(
        int productId, int stockQuantity, AppDbContext context)
    {
        var item = new InventoryItem { ProductId = productId, StockQuantity = stockQuantity, UpdateDate = DateTime.UtcNow };
        context.InventoryItems.Add(item);
        await context.SaveChangesAsync();
        return item;
    }

    public async Task<InventoryItem> UpdateInventoryItemAsync(
        int id, int productId, int stockQuantity, AppDbContext context)
    {
        var item = await context.InventoryItems.FindAsync(id);
        if (item == null) throw new Exception("Inventory item not found");
        item.ProductId = productId;
        item.StockQuantity = stockQuantity;
        item.UpdateDate = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return item;
    }

    public async Task<bool> DeleteInventoryItemAsync(int id, AppDbContext context)
    {
        var item = await context.InventoryItems.FindAsync(id);
        if (item == null) return false;
        context.InventoryItems.Remove(item);
        await context.SaveChangesAsync();
        return true;
    }
}
