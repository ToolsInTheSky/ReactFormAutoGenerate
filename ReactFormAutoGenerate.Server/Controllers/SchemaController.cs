using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Schema;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SchemaController : ControllerBase
{
    private readonly JsonSerializerOptions _options;

    public SchemaController()
    {
        _options = new JsonSerializerOptions(JsonSerializerOptions.Default)
        {
            ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
        };
    }

    [HttpGet("category")]
    public IActionResult GetCategorySchema()
    {
        JsonNode schema = _options.GetJsonSchemaAsNode(typeof(Category));
        return Ok(schema);
    }

    [HttpGet("product")]
    public IActionResult GetProductSchema()
    {
        JsonNode schema = _options.GetJsonSchemaAsNode(typeof(Product));
        return Ok(schema);
    }

    [HttpGet("all")]
    public IActionResult GetAllSchemas()
    {
        var schemas = new Dictionary<string, JsonNode>
        {
            { "Category", _options.GetJsonSchemaAsNode(typeof(Category)) },
            { "Product", _options.GetJsonSchemaAsNode(typeof(Product)) }
        };

        return Ok(schemas);
    }

    [HttpGet("uniforms/category")]
    public IActionResult GetUniformsCategorySchema()
    {
        var schema = _options.GetJsonSchemaAsNode(typeof(Category)).AsObject();
        
        // uniforms는 ["object", "null"] 같은 다중 타입을 잘 처리하지 못하므로 "object"로 강제합니다.
        if (schema.TryGetPropertyValue("type", out var typeNode))
        {
            schema["type"] = "object";
        }

        // properties 내부의 null 허용 타입들도 정리합니다.
        if (schema.TryGetPropertyValue("properties", out var propertiesNode) && propertiesNode is JsonObject properties)
        {
            foreach (var property in properties)
            {
                var propObj = property.Value?.AsObject();
                if (propObj != null && propObj.TryGetPropertyValue("type", out var pType))
                {
                    if (pType is JsonArray pArray)
                    {
                        // ["string", "null"] -> "string"
                        var firstNonNeighbors = pArray.FirstOrDefault(t => t?.GetValue<string>() != "null");
                        if (firstNonNeighbors != null)
                        {
                            propObj["type"] = firstNonNeighbors.GetValue<string>();
                        }
                    }
                }
            }
        }

        return Ok(schema);
    }

    [HttpGet("uniforms/product")]
    public IActionResult GetUniformsProductSchema()
    {
        var schema = _options.GetJsonSchemaAsNode(typeof(Product)).AsObject();
        
        // uniforms compatibility: force "object" type
        if (schema.TryGetPropertyValue("type", out var typeNode))
        {
            schema["type"] = "object";
        }

        // Clean up nullable types in properties
        if (schema.TryGetPropertyValue("properties", out var propertiesNode) && propertiesNode is JsonObject properties)
        {
            foreach (var property in properties)
            {
                var propObj = property.Value?.AsObject();
                if (propObj != null && propObj.TryGetPropertyValue("type", out var pType))
                {
                    if (pType is JsonArray pArray)
                    {
                        var firstNonNeighbors = pArray.FirstOrDefault(t => t?.GetValue<string>() != "null");
                        if (firstNonNeighbors != null)
                        {
                            propObj["type"] = firstNonNeighbors.GetValue<string>();
                        }
                    }
                }
            }
        }

        return Ok(schema);
    }
}
