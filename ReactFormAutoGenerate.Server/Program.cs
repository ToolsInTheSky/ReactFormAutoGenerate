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
    if (!context.Categories.Any())
    {
        context.Categories.AddRange(
            new Category { Name = "Electronics" },
            new Category { Name = "Books" }
        );
        context.SaveChanges();
    }

    var electronics = context.Categories.FirstOrDefault(c => c.Name == "Electronics");
    var books = context.Categories.FirstOrDefault(c => c.Name == "Books");

    // Ensure Products exist (at least 50 for paging tests)
    if (electronics != null && books != null)
    {
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
    }

    // Ensure ProductLogs exist (at least 30)
    var logCount = context.ProductLogs.Count();
    if (logCount < 30)
    {
        var firstProduct = context.Products.FirstOrDefault();
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
}

app.MapControllers();
app.MapGraphQL(); // Map GraphQL endpoint

app.MapFallbackToFile("/index.html");

app.Run();
