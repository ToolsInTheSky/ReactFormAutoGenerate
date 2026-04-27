using Microsoft.EntityFrameworkCore;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Category> Categories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<InventoryItem> InventoryItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Set default schema
        modelBuilder.HasDefaultSchema("reactform_schema");

        // Configure Category-Product relationship
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure Product-InventoryItem relationship
        modelBuilder.Entity<InventoryItem>()
            .HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Set default value for UpdateDate
        modelBuilder.Entity<Product>()
            .Property(p => p.UpdateDate)
            .HasDefaultValueSql("now()");

        modelBuilder.Entity<InventoryItem>()
            .Property(i => i.UpdateDate)
            .HasDefaultValueSql("now()");
    }
}
