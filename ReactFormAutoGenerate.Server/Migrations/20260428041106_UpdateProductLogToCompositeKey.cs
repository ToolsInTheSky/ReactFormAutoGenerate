using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReactFormAutoGenerate.Server.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProductLogToCompositeKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "PerformedBy",
                schema: "reactform_schema",
                table: "ProductLogs",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ProductLogs",
                schema: "reactform_schema",
                table: "ProductLogs",
                columns: new[] { "ProductId", "Activity", "LogDate", "PerformedBy" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ProductLogs",
                schema: "reactform_schema",
                table: "ProductLogs");

            migrationBuilder.AlterColumn<string>(
                name: "PerformedBy",
                schema: "reactform_schema",
                table: "ProductLogs",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);
        }
    }
}
