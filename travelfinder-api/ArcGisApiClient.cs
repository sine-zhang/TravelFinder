using Microsoft.AspNetCore.WebUtilities;
using Newtonsoft.Json;

namespace TravelfinderAPI
{
    public class ArcGisApiClient
    {
        public ArcGisApiClient(string apiKey, bool enableProxy)
        {
            _apiKey = apiKey;
            _enableProxy = enableProxy;
        }

        private HttpClient GetNewClient(bool enableProxy)
        {
            HttpClient client = null;

            if (enableProxy)
            {
                client = Utils.CreateProxy($"http://127.0.0.1:2084");
            }
            else
            {
                client = new HttpClient();
            }

            return client;
        }

        public async Task<PlaceResult> NearPoint(double x, double y, int radius, int[] categoryIds, int pageSize)
        {
            var parameters = new Dictionary<string, string?>
            {
                ["x"] = Convert.ToString(x),
                ["y"] = Convert.ToString(y),
                ["radius"] = Convert.ToString(radius),
                ["categoryIds"] = string.Join(',', categoryIds),
                ["pageSize"] = Convert.ToString(pageSize),
                ["f"] = "pjson",
                ["token"] = _apiKey,
            };

            var httpClient = GetNewClient(true);

            var url = "places/near-point";
            httpClient.BaseAddress = new Uri(PLACE_API_ADDRESS);
            var response = await httpClient.GetAsync(QueryHelpers.AddQueryString(url, parameters));

            response.EnsureSuccessStatusCode();
            var responseBody = await response.Content.ReadAsStringAsync();

            var placeResult = JsonConvert.DeserializeObject<PlaceResult>(responseBody);

            return placeResult;
        }

        public const string PLACE_API_ADDRESS = "https://places-api.arcgis.com/arcgis/rest/services/places-service/v1/";

        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly bool _enableProxy;
    }

    public class PlaceResult
    {
        public Place[] Results { get; set; }
    }

    public class Place
    {
        public string PlaceId { get; set; }
        public string Name { get; set; }
        public Category[] Categories { get; set; }
        public double Distance { get; set; }
    
    }

    public class Category
    {
        public string CategoryId { get; set; }
        public string Label { get; set; }
    }

    public class Location
    {
        public double X { get; set; }
        public double Y { get; set; }
    }

}
