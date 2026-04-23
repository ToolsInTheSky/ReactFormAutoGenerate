using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Schema;
using HotChocolate;
using HotChocolate.Data;
using HotChocolate.Types;
using ReactFormAutoGenerate.Server.Data;
using ReactFormAutoGenerate.Server.Entities;

namespace ReactFormAutoGenerate.Server.GraphQL;

public class Query
{
    [UseOffsetPaging(IncludeTotalCount = true)]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Category> GetCategories(AppDbContext context) =>
        context.Categories;

    [UseOffsetPaging(IncludeTotalCount = true)]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Product> GetProducts(AppDbContext context) =>
        context.Products;

    /// <summary>
    /// Returns the JSON Schema for a given entity type.
    /// protocol: "rjsf" or "uniforms"
    /// </summary>
    public string GetJsonSchema(string entityName, string protocol)
    {
        var type = typeof(Category).Assembly.GetTypes().FirstOrDefault(t => 
            t.Namespace == "ReactFormAutoGenerate.Server.Entities" && 
            string.Equals(t.Name, entityName, StringComparison.OrdinalIgnoreCase));

        if (type == null) return "{}";

        var options = new JsonSerializerOptions(JsonSerializerOptions.Default)
        {
            ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
        };

        var schemaNode = options.GetJsonSchemaAsNode(type);

        if (string.Equals(protocol, "uniforms", StringComparison.OrdinalIgnoreCase))
        {
            var obj = schemaNode.AsObject();
            CleanSchemaForUniforms(obj);
            return obj.ToJsonString();
        }

        return schemaNode.ToJsonString();
    }

    private void CleanSchemaForUniforms(JsonObject schema)
    {
        if (schema.TryGetPropertyValue("type", out var typeNode))
            schema["type"] = "object";

        if (schema.TryGetPropertyValue("properties", out var propertiesNode) && propertiesNode is JsonObject properties)
        {
            foreach (var property in properties)
            {
                var propObj = property.Value?.AsObject();
                if (propObj != null && propObj.TryGetPropertyValue("type", out var pType))
                {
                    if (pType is JsonArray pArray)
                    {
                        var first = pArray.FirstOrDefault(t => t?.GetValue<string>() != "null");
                        if (first != null) propObj["type"] = first.GetValue<string>();
                    }
                }
            }
        }
    }
}
