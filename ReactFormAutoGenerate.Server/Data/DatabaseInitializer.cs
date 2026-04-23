using Microsoft.EntityFrameworkCore;
using Npgsql;
using ReactFormAutoGenerate.Server.Data;

namespace ReactFormAutoGenerate.Server.Data;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        var databaseName = builder.Database;

        // 1. Create the database itself if it doesn't exist
        // Connect to 'postgres' master database first to create the target database
        builder.Database = "postgres";
        var masterConnectionString = builder.ToString();

        try
        {
            using var connection = new NpgsqlConnection(masterConnectionString);
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = $"SELECT 1 FROM pg_database WHERE datname = '{databaseName}'";
            var exists = await command.ExecuteScalarAsync() != null;

            if (!exists)
            {
                command.CommandText = $"CREATE DATABASE \"{databaseName}\"";
                await command.ExecuteNonQueryAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error ensuring database exists: {ex.Message}");
        }

        // 2. Apply EF Core Migrations (which will create the schema and tables)
        try
        {
            await dbContext.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error applying migrations: {ex.Message}");
        }
    }
}
