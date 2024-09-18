using TravelfinderAPI.Functions;
using Microsoft.AspNetCore.WebUtilities;
using Newtonsoft.Json;
using System.Security.Cryptography.X509Certificates;
using System.Xml.Linq;
using TravelfinderAPI.GmpGis;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace TravelfinderAPI
{
    public class ArcGisApiClient
    {
        public ArcGisApiClient(string apiKey, bool enableProxy, string pointLayerURL)
        {
            _apiKey = apiKey;
            _enableProxy = enableProxy;
            _pointLayerURL = pointLayerURL;
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

        public async Task<FeatureResult> Query(string geometry, int sr=4326, string where="1=1", int distance = 5000, int resultOffset=0, int resultRecordCount=50)
        {
            var parameters = new Dictionary<string, string?>
            {
                ["f"] = "json",
                ["token"] = _apiKey,
                ["returnGeometry"] = "true",
                ["outFields"] = "*",
                ["resultOffset"] = resultOffset.ToString(),
                ["resultRecordCount"] = resultRecordCount.ToString(),
                ["where"] = where,
                ["geometry"] = geometry,
                ["geometryType"] = "esriGeometryPoint",
                ["spatialRel"] = "esriSpatialRelIntersects",
                ["distance"] = distance.ToString(),
                ["units"] = "esriSRUnit_Meter",
                ["outSR"] = sr.ToString(),
            };

            var httpClient = GetNewClient(true);

            var formContent = new FormUrlEncodedContent(parameters);

            httpClient.BaseAddress = new Uri("https://services8.arcgis.com/");
            var response = await httpClient.PostAsync("kULjRYHBqUKIzQCS/arcgis/rest/services/travelfinder_point_layer/FeatureServer/0/query", formContent);

            response.EnsureSuccessStatusCode();
            var responseBody = await response.Content.ReadAsStringAsync();

            var featureResult = JsonConvert.DeserializeObject<FeatureResult>(responseBody);

            return featureResult;
        }

        public async Task<ApplyEditResult> ApplyEdits(string adds)
        {
            var parameters = new Dictionary<string, string?>
            {
                ["f"] = "pjson",
                ["token"] = _apiKey,
            };

            if (!string.IsNullOrEmpty(adds))
            {
                parameters["adds"] = adds;
            }

            var httpClient = GetNewClient(true);

            var formContent = new FormUrlEncodedContent(parameters);

            httpClient.BaseAddress = new Uri("https://services8.arcgis.com/");
            var response = await httpClient.PostAsync("kULjRYHBqUKIzQCS/arcgis/rest/services/travelfinder_point_layer/FeatureServer/0/applyEdits", formContent);

            response.EnsureSuccessStatusCode();
            var responseBody = await response.Content.ReadAsStringAsync();

            var applyEditResult = JsonConvert.DeserializeObject<ApplyEditResult>(responseBody);

            return applyEditResult;
        }

        public async Task<GmpGis.PlaceResult> NearPoint(double latitude, double longitude, int radius, int pageSize)
        {
            var newCoord = new Coordinates(latitude, longitude);
            var oldCoord = new Coordinates(_latitude, _longitude);

            var distance = oldCoord.DistanceTo(newCoord, UnitOfLength.Kilometers);

            if (distance <= 999 && _placeResult != null)
            {
                return _placeResult;
            }

            var featureResult = await Query($"{longitude},{latitude}", 4326, "1=1", 5000, 0, pageSize);

            var places = featureResult.Features.Select(feature => feature.ToPlace());

            _latitude = latitude;
            _longitude = longitude;
            _placeResult = new GmpGis.PlaceResult() { Places = places.ToArray() }; ;

            return _placeResult;
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
        private string _pointLayerURL;

        private double _latitude;
        private double _longitude;
        private GmpGis.PlaceResult _placeResult;
    }

    public class FeatureResult
    {
        public FeatureRecord[] Features { get; set; }
    }

    public class FeatureRecord
    {
        public FeatureAttributes Attributes { get; set; }
        public FeatureGeometry Geometry { get; set; }

        public GmpGis.Place ToPlace()
        {
            return new GmpGis.Place()
            {
                Name = this.Attributes.Name,
                PrimaryType = this.Attributes.Category,
                FormattedAddress = this.Attributes.FormattedAddress,
                Location = new GmpGis.Location()
                {
                    Latitude = this.Geometry.Latitude,
                    Longitude = this.Geometry.Longitude
                }
            };
        }
    }

    public class FeatureGeometry
    {
        [JsonProperty("y")]
        public double Latitude { get; set; }

        [JsonProperty("x")]
        public double Longitude { get; set; }
    }

    public class FeatureAttributes
    {
        public int OBJECTID { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public string Description { get; set; }
        public string FormattedAddress { get; set; }
    }

    public class ApplyEditRequest
    {
        public string adds { get;set; }
    }

    public class ApplyEditResult
    {
        public AddResult[] AddResults { get; set; }
        public UpdateResult[] UpdateResults { get; set; }
        public DeleteResult[] DeleteResults { get; set; }
    }

    public class AddResult
    {
        public int ObjectId { get; set; }
        public int UniqueId { get; set; }
        public string GlobalId { get; set; }
        public bool Success { get; set; }
    }

    public class UpdateResult
    {
        public int ObjectId { get; set; }
        public int UniqueId { get; set; }
        public string GlobalId { get; set; }
        public bool Success { get; set; }
    }

    public class DeleteResult
    {
        public int ObjectId { get; set; }
        public int UniqueId { get; set; }
        public string GlobalId { get; set; }
        public bool Success { get; set; }
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
