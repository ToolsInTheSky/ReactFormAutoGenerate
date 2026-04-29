using Microsoft.EntityFrameworkCore;
using ReactFormAutoGenerate.Server.Data;
using ReactFormAutoGenerate.Server.Entities;
using ReactFormAutoGenerate.Server.GraphQL;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContextFactory<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();

// Register GraphQL Server
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .RegisterDbContextFactory<AppDbContext>()
    .AddProjections()
    .AddFiltering()
    .AddSorting()
    .ModifyRequestOptions(opt => opt.IncludeExceptionDetails = builder.Environment.IsDevelopment());

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

// 1. Initialize Database (Create if not exists and Apply Migrations)
await DatabaseInitializer.InitializeAsync(app.Services);

// 2. Seed data
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Ensure Categories exist
    var electronics = context.Categories.AsEnumerable().FirstOrDefault(c => string.Equals(c.Name, "Electronics", StringComparison.OrdinalIgnoreCase));
    var books = context.Categories.AsEnumerable().FirstOrDefault(c => string.Equals(c.Name, "Books", StringComparison.OrdinalIgnoreCase));

    if (electronics == null)
    {
        electronics = new Category { Name = "Electronics" };
        context.Categories.Add(electronics);
    }
    if (books == null)
    {
        books = new Category { Name = "Books" };
        context.Categories.Add(books);
    }
    context.SaveChanges();

    // Ensure Products exist (at least 50 for paging tests)
    var productCount = context.Products.Count();
    if (productCount < 50)
    {
        for (int i = productCount + 1; i <= 50; i++)
        {
            context.Products.Add(new Product
            {
                Name = $"Product {i}",
                Price = 10.00m + i,
                CategoryId = (i % 2 == 0) ? electronics.Id : books.Id
            });
        }
        context.SaveChanges();
    }

    // Ensure ProductLogs exist (at least 30)
    var logCount = context.ProductLogs.Count();
    if (logCount < 30)
    {
        var firstProduct = context.Products.OrderBy(p => p.Id).FirstOrDefault();
        if (firstProduct != null)
        {
            for (int i = logCount + 1; i <= 30; i++)
            {
                context.ProductLogs.Add(new ProductLog 
                { 
                    ProductId = firstProduct.Id, 
                    Activity = $"Automated activity log {i}", 
                    PerformedBy = (i % 3 == 0) ? "System" : "Admin",
                    LogDate = DateTime.UtcNow.AddMinutes(-i)
                });
            }
            context.SaveChanges();
        }
    }

    Console.WriteLine($"Seeding complete: {context.Categories.Count()} categories, {context.Products.Count()} products, {context.ProductLogs.Count()} logs.");
}

app.MapControllers();
app.MapGraphQL(); // Map GraphQL endpoint

app.MapFallbackToFile("/index.html");

app.Run();
