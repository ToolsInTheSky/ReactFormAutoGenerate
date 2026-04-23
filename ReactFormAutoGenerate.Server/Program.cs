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
    .AddSorting();

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
    
    if (!context.Categories.Any())
    {
        var electronics = new Category { Name = "Electronics" };
        var books = new Category { Name = "Books" };
        context.Categories.AddRange(electronics, books);
        context.SaveChanges();

        if (!context.Products.Any())
        {
            context.Products.Add(new Product 
            { 
                Name = "Smartphone", 
                Price = 699.99m, 
                CategoryId = electronics.Id 
            });
            context.Products.Add(new Product 
            { 
                Name = "Laptop", 
                Price = 1299.99m, 
                CategoryId = electronics.Id 
            });
            context.Products.Add(new Product 
            { 
                Name = "C# in Depth", 
                Price = 45.00m, 
                CategoryId = books.Id 
            });
            context.SaveChanges();
        }
    }
}

app.MapControllers();
app.MapGraphQL(); // Map GraphQL endpoint

app.MapFallbackToFile("/index.html");

app.Run();
