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
}
