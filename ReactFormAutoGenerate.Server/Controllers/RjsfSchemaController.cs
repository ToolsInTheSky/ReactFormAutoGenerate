using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Schema;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.Controllers;

[ApiController]
[Route("api/schema/rjsf")]
public class RjsfSchemaController : ControllerBase
{
    private readonly JsonSerializerOptions _options;

    public RjsfSchemaController()
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

        JsonNode schema = _options.GetJsonSchemaAsNode(type);
        return Ok(schema);
    }

    private Type? GetEntityType(string name)
    {
        return typeof(Category).Assembly.GetTypes().FirstOrDefault(t => 
            t.Namespace == "ReactFormAutoGenerate.Server.Entities" && 
            string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));
    }
}
