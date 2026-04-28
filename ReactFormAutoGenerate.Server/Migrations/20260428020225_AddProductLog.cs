using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReactFormAutoGenerate.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddProductLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductLogs",
                schema: "reactform_schema",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    Activity = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    LogDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PerformedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductLogs",
                schema: "reactform_schema");
        }
    }
}
