using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Schema;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.Controllers;

[ApiController]
[Route("api/schema/uniforms")]
public class UniformsSchemaController : ControllerBase
{
    private readonly JsonSerializerOptions _options;

    public UniformsSchemaController()
    {
        _options = new JsonSerializerOptions(JsonSerializerOptions.Default)
        {
            ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
        };
    }

    [HttpGet("{name}")]
    public IActionResult GetSchema(string name)
    {
        var type = GetEntityType(name);
        if (type == null) return NotFound($"Entity '{name}' not found.");

        var schema = _options.GetJsonSchemaAsNode(type).AsObject();
        CleanSchemaForUniforms(schema);
        
        return Ok(schema);
    }

    private Type? GetEntityType(string name)
    {
        return typeof(Category).Assembly.GetTypes().FirstOrDefault(t => 
            t.Namespace == "ReactFormAutoGenerate.Server.Entities" && 
            string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));
    }

    private void CleanSchemaForUniforms(JsonObject schema)
    {
        if (schema.TryGetPropertyValue("type", out var typeNode))
        {
            schema["type"] = "object";
        }

        if (schema.TryGetPropertyValue("properties", out var propertiesNode) && propertiesNode is JsonObject properties)
        {
            foreach (var property in properties)
            {
                var propObj = property.Value?.AsObject();
                if (propObj != null && propObj.TryGetPropertyValue("type", out var pType))
                {
                    if (pType is JsonArray pArray)
                    {
                        var firstNonNullable = pArray.FirstOrDefault(t => t?.GetValue<string>() != "null");
                        if (firstNonNullable != null)
                        {
                            propObj["type"] = firstNonNullable.GetValue<string>();
                        }
                    }
                }
            }
        }
    }
}
