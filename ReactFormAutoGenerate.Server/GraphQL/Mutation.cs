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
}
