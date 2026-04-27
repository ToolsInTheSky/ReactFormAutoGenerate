using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReactFormAutoGenerate.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddUpdateDateToCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdateDate",
                schema: "reactform_schema",
                table: "Categories",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UpdateDate",
                schema: "reactform_schema",
                table: "Categories");
        }
    }
}
