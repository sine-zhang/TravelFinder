using Newtonsoft.Json;

namespace TravelfinderAPI.Functions
{
    public class GeocodeFunction
    {
        [JsonProperty("description")]
        public string Description { get; set; } = "get latitude and longitude based on the address";

        [JsonProperty("name")]
        public string Name { get; set; } = "GeocodeAddress";

        [JsonProperty("parameters")]
        public GeocodeParameters Parameters { get; set; } = new GeocodeParameters();
    }

    public class Address
    {
        [JsonProperty("type")]
        public string Type { get; set; } = "string";

        [JsonProperty("description")]
        public string Description { get; set; } = "the address that need to be geocoded";
    }

    public class GeocodeParameters
    {
        [JsonProperty("type")]
        public string Type { get; set; } = "object";

        [JsonProperty("properties")]
        public GeocodeProperties Properties { get; set; } = new GeocodeProperties();

        [JsonProperty("required")]
        public List<string> Required { get; set; } = new List<string>() { "address" };
    }

    public class GeocodeProperties
    {
        [JsonProperty("address")]
        public Address Address { get; set; }
    }

    public class Function
    {
        [JsonProperty("description")]
        public string Description { get; set; }
        [JsonProperty("name")]
        public string Name { get; set; }
        [JsonProperty("parameters")]
        public Parameters Parameters { get; set; }

    }

    public class Tool
    {
        [JsonProperty("type")]
        public string Type { get; set; } = "function";
        [JsonProperty("function")]
        public Function Function { get; set; }
    }

    public class Parameters
    {
        [JsonProperty("type")]
        public string Type { get; set; } = "object";

        [JsonProperty("properties")]
        public Dictionary<string, Property> Properties { get; set; }

        [JsonProperty("required")]
        public List<string> Required { get; set; }

    }

    public class Property
    {
        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("items")]
        public PropertyItems Items { get; set; }

        [JsonProperty("description")]
        public string Description { get; set; }
    }

    public class PropertyItems
    {
        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("enum")]
        public string[] Enum { get; set; }
    }

    public class FunctionData
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("arguments_map")]
        public Dictionary<string,string> Arguments {
            get {

                if (_arguments == null)
                {
                    _arguments = JsonConvert.DeserializeObject<Dictionary<string, string>>(argumentsContent);
                    argumentsContent = "";
                }

                return _arguments;
            }
        }

        private Dictionary<string, string> _arguments;

        [JsonProperty("arguments")]
        private string argumentsContent { get; set; }
    }

    public class ToolCall
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("function")]
        public FunctionData Function { get; set; }
    }
}
