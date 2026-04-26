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
        SchemaType = SchemaType.JsonSchema
    };

    [HttpGet("all")]
    public IActionResult GetAllSchemas()
    {
        var entities = new[] { typeof(Category), typeof(Product), typeof(InventoryItem) };
        var schemas = new Dictionary<string, JObject>();

        foreach (var type in entities)
        {
            var schema = JsonSchema.FromType(type, Settings);
            ProcessCustomMetadata(schema, type);
            schemas[type.Name] = JObject.Parse(schema.ToJson());
        }

        // 하위 호환성을 위해 RJSF/Uniforms 키 구조 유지 (값은 동일)
        return Ok(new { RJSF = schemas, Uniforms = schemas });
    }

    [HttpGet("{name}")]
    public IActionResult GetSchema(string name)
    {
        var type = GetEntityType(name);
        if (type == null) return NotFound($"Entity '{name}' not found.");

        var schema = JsonSchema.FromType(type, Settings);
        ProcessCustomMetadata(schema, type);
        
        return Content(schema.ToJson(), "application/json");
    }

    public static void ProcessCustomMetadata(JsonSchema schema, Type type)
    {
        foreach (var prop in type.GetProperties())
        {
            if (schema.Properties != null && schema.Properties.TryGetValue(prop.Name, out var jsonProp))
            {
                if (jsonProp.ExtensionData == null) jsonProp.ExtensionData = new Dictionary<string, object>();
                if (prop.GetCustomAttribute<KeyAttribute>() != null) jsonProp.ExtensionData["x-identity"] = true;
                
                if (prop.Name.Length > 2 && prop.Name.EndsWith("Id"))
                {
                    var fkAttr = prop.GetCustomAttribute<ForeignKeyAttribute>();
                    var entityBaseName = fkAttr?.Name ?? prop.Name.Substring(0, prop.Name.Length - 2);
                    jsonProp.ExtensionData["x-relation"] = entityBaseName.Pluralize().ToLower();
                }
            }
        }
    }

    private Type? GetEntityType(string name)
    {
        return typeof(Category).Assembly.GetTypes().FirstOrDefault(t => 
            t.Namespace == "ReactFormAutoGenerate.Server.Entities" && 
            string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));
    }
}
