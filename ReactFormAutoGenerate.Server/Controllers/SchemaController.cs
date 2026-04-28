using Microsoft.AspNetCore.Mvc;
using NJsonSchema;
using NJsonSchema.Generation;
using NJsonSchema.NewtonsoftJson.Generation;
using System.Reflection;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Humanizer;
using Newtonsoft.Json.Linq;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SchemaController : ControllerBase
{
    public static readonly NewtonsoftJsonSchemaGeneratorSettings Settings = new NewtonsoftJsonSchemaGeneratorSettings
    {
        DefaultReferenceTypeNullHandling = ReferenceTypeNullHandling.NotNull,
        GenerateAbstractProperties = true,
        SchemaType = SchemaType.JsonSchema,
        SchemaProcessors = { new CustomMetadataProcessor() }
    };

    public class CustomMetadataProcessor : ISchemaProcessor
    {
        public void Process(SchemaProcessorContext context)
        {
            if (context.Schema.Properties == null) return;

            foreach (var prop in context.ContextualType.Type.GetProperties())
            {
                if (context.Schema.Properties.TryGetValue(prop.Name, out var jsonProp))
                {
                    if (jsonProp.ExtensionData == null) jsonProp.ExtensionData = new Dictionary<string, object?>();
                    
                    // Add x-identity for properties with [Key] attribute or named "Id"
                    if (prop.GetCustomAttribute<KeyAttribute>() != null || 
                        string.Equals(prop.Name, "Id", StringComparison.OrdinalIgnoreCase))
                    {
                        jsonProp.ExtensionData["x-identity"] = true;
                    }

                    // Add x-relation for foreign key fields
                    var fkAttr = prop.GetCustomAttribute<ForeignKeyAttribute>();
                    string? entityBaseName = null;

                    if (fkAttr != null)
                    {
                        // ForeignKey attribute is on the ID property itself, pointing to the navigation property name
                        entityBaseName = fkAttr.Name;
                    }
                    else
                    {
                        // Check if there's a navigation property that has a [ForeignKey] attribute pointing to this property
                        var navigationProp = context.ContextualType.Type.GetProperties()
                            .FirstOrDefault(p => p.GetCustomAttribute<ForeignKeyAttribute>()?.Name == prop.Name);

                        if (navigationProp != null)
                        {
                            entityBaseName = navigationProp.Name;
                        }
                    }

                    if (!string.IsNullOrEmpty(entityBaseName))
                    {
                        jsonProp.ExtensionData["x-relation"] = entityBaseName.Pluralize().ToLower();
                    }
                }
            }
        }
    }

    [HttpGet("all")]
    public IActionResult GetAllSchemas()
    {
        var entities = new[] { typeof(Category), typeof(Product), typeof(InventoryItem) };
        var schemas = new Dictionary<string, object>();

        foreach (var type in entities)
        {
            var schema = JsonSchema.FromType(type, Settings);
            // Serialize to string and back to object to avoid JObject/System.Text.Json conflict
            var schemaJson = schema.ToJson();
            schemas[type.Name] = System.Text.Json.JsonSerializer.Deserialize<object>(schemaJson)!;
        }

        // Maintain key structure for RJSF/Uniforms
        return Ok(new { rjsf = schemas, uniforms = schemas });
    }

    [HttpGet("{name}")]
    public IActionResult GetSchema(string name)
    {
        var type = GetEntityType(name);
        if (type == null) return NotFound($"Entity '{name}' not found.");

        var schema = JsonSchema.FromType(type, Settings);
        
        return Content(schema.ToJson(), "application/json");
    }

    private Type? GetEntityType(string name)
    {
        return typeof(Category).Assembly.GetTypes().FirstOrDefault(t => 
            t.Namespace == "ReactFormAutoGenerate.Server.Entities" && 
            string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));
    }
}
