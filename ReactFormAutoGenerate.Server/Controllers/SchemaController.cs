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

            var allProps = context.ContextualType.Type.GetProperties();
            bool hasIdentity = false;

            foreach (var prop in allProps)
            {
                if (context.Schema.Properties.TryGetValue(prop.Name, out var jsonProp))
                {
                    if (jsonProp.ExtensionData == null) jsonProp.ExtensionData = new Dictionary<string, object?>();
                    
                    // Add x-identity for properties with [Key] attribute or named "Id"
                    if (prop.GetCustomAttribute<KeyAttribute>() != null || 
                        string.Equals(prop.Name, "Id", StringComparison.OrdinalIgnoreCase))
                    {
                        jsonProp.ExtensionData["x-identity"] = true;
                        hasIdentity = true;
                    }

                    // Add x-relation for foreign key fields
                    var fkAttr = prop.GetCustomAttribute<ForeignKeyAttribute>();
                    string? entityBaseName = null;

                    // Ensure we only apply x-relation to simple ID properties, not navigation objects
                    bool isSimpleType = prop.PropertyType.IsPrimitive || 
                                       prop.PropertyType == typeof(int) || 
                                       prop.PropertyType == typeof(long) || 
                                       prop.PropertyType == typeof(string) || 
                                       prop.PropertyType == typeof(decimal) ||
                                       Nullable.GetUnderlyingType(prop.PropertyType) != null;

                    if (isSimpleType)
                    {
                        if (fkAttr != null)
                        {
                            entityBaseName = fkAttr.Name;
                        }
                        else
                        {
                            var navigationProp = allProps.FirstOrDefault(p => p.GetCustomAttribute<ForeignKeyAttribute>()?.Name == prop.Name);
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

            // If no single identity property was found, mark as keyless and provide all fields as composite identity
            if (!hasIdentity)
            {
                if (context.Schema.ExtensionData == null) context.Schema.ExtensionData = new Dictionary<string, object?>();
                context.Schema.ExtensionData["x-keyless"] = true;
                context.Schema.ExtensionData["x-identity-fields"] = allProps.Select(p => p.Name).ToList();
            }
        }
    }

    [HttpGet("all")]
    public IActionResult GetAllSchemas()
    {
        var entities = new[] { typeof(Category), typeof(Product), typeof(InventoryItem), typeof(ProductLog) };
        var schemas = new Dictionary<string, object>();

        foreach (var type in entities)
        {
            var schema = JsonSchema.FromType(type, Settings);
            schema.Id = null; // Fix: Remove root 'id' to avoid AJV 8+ errors
            
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
        schema.Id = null; // Fix: Remove root 'id'
        
        return Content(schema.ToJson(), "application/json");
    }

    private Type? GetEntityType(string name)
    {
        return typeof(Category).Assembly.GetTypes().FirstOrDefault(t => 
            t.Namespace == "ReactFormAutoGenerate.Server.Entities" && 
            string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));
    }
}
