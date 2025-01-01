using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Drawing.Printing;
using System.Reflection;
using System.Text;

namespace TravelfinderAPI.GmpGis
{
    public class GmpGisApiClient
    {
        public GmpGisApiClient(string apiKey, bool enableProxy)
        {
            _apiKey = apiKey;
            _enableProxy = enableProxy;
        }

        private HttpClient GetNewClient(bool enableProxy)
        {
            HttpClient client = null;

            if (enableProxy)
            {
                client = Utils.CreateProxy($"socks5://127.0.0.1:2085");
            }
            else
            {
                client = new HttpClient();
            }

            return client;
        }

        public async Task<PlaceResult> SearchText(string textQuery, double latitude, double longitude, int radius, string languageCode, int pageSize)
        {
            var httpClient = GetNewClient(true);

            var requestBody = new
            {
                textQuery = textQuery,
                languageCode = languageCode,
                maxResultCount = pageSize,
                locationBias = new
                {
                    circle = new
                    {
                        center = new { latitude = latitude, longitude = longitude },
                        radius = radius
                    }
                }
            };

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, "searchText")
            {
                Content = JsonContent.Create(requestBody)
            };

            httpClient.DefaultRequestHeaders.Add("X-Goog-Api-Key", _apiKey);
            httpClient.DefaultRequestHeaders.Add("X-Goog-FieldMask", "places.displayName,places.formattedAddress,places.primaryType,places.rating,places.location,places.id");

            var response = await httpClient.PostAsync("https://places.googleapis.com/v1/places:searchText", JsonContent.Create(requestBody));
            response.EnsureSuccessStatusCode();
            var responseBody = await response.Content.ReadAsStringAsync();

            var placeResult = JsonConvert.DeserializeObject<PlaceResult>(responseBody);

            return placeResult;
        }

        public async Task<GeocodeResult> ReverseGeocode(double latitude, double longitude)
        {
            var httpClient = GetNewClient(true);

            var response = await httpClient.GetAsync($"https://maps.googleapis.com/maps/api/geocode/json?result_type=administrative_area_level_1&latlng={latitude},{longitude}&key={_apiKey}");
            response.EnsureSuccessStatusCode();
            var responseBody = await response.Content.ReadAsStringAsync();

            var geocodeResult = JsonConvert.DeserializeObject<GeocodeResult>(responseBody);

            return geocodeResult;
        }

        public async Task<GeocodeResult> Geocode(string address)
        {
            var httpClient = GetNewClient(true);

            var response = await httpClient.GetAsync($"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={_apiKey}");
            response.EnsureSuccessStatusCode();
            var responseBody = await response.Content.ReadAsStringAsync();

            var geocodeResult = JsonConvert.DeserializeObject<GeocodeResult>(responseBody);

            return geocodeResult;
        }

        public async Task<PlaceResult> NearPoint(double latitude, double longitude, int radius, string languageCode, int pageSize, string[] includeTypes, bool enableCache = false)
        {
            var newCoord = new Coordinates(latitude, longitude);
            var oldCoord = new Coordinates(_latitude, _longitude);

            var distance = oldCoord.DistanceTo(newCoord, UnitOfLength.Kilometers);

            if (distance <= 999 && _placeResult != null)
            {
                return _placeResult;
            }

            try
            {
                if (includeTypes.Length == 0)
                {
                    includeTypes = new string[] { "park", "restaurant", "art_gallery", "museum", "historical_landmark", "cafe", "bar", "library", "night_club", "store", "jewelry_store" };
                }

                var requestBody = new
                {
                    includedTypes = includeTypes,
                    languageCode = languageCode,
                    maxResultCount = pageSize,
                    locationRestriction = new
                    {
                        circle = new
                        {
                            center = new { latitude = latitude, longitude = longitude },
                            radius = radius
                        }
                    }
                };

                var httpClient = GetNewClient(true);

                var requestMessage = new HttpRequestMessage(HttpMethod.Post, "searchNearby")
                {
                    Content = JsonContent.Create(requestBody)
                };

                httpClient.DefaultRequestHeaders.Add("X-Goog-Api-Key", _apiKey);
                httpClient.DefaultRequestHeaders.Add("X-Goog-FieldMask", "places.displayName,places.formattedAddress,places.id,places.primaryType,places.rating,places.location,places.price_level");

                var response = await httpClient.PostAsync("https://places.googleapis.com/v1/places:searchNearby", JsonContent.Create(requestBody));
                response.EnsureSuccessStatusCode();
                var responseBody = await response.Content.ReadAsStringAsync();

                var placeResult = JsonConvert.DeserializeObject<PlaceResult>(responseBody);
                _placeResult = placeResult;
            }
            catch(Exception ex)
            {
                var dd = ex.ToString();
            }


            _latitude = latitude;
            _longitude = longitude;

            return _placeResult;
        }

        public const string PLACE_API_ADDRESS = "https://places.googleapis.com/v1/";

        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly bool _enableProxy;
        private readonly IMemoryCache _cache;

        private double _latitude;
        private double _longitude;
        private PlaceResult _placeResult;
    }

    public class PlaceResult
    {
        public Place[] Places { get; set; }
    }

    public class Place
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string FormattedAddress { get; set; }
        public string PrimaryType { get; set; }
        public double Rating { get; set; }

        public DisplayName DisplayName { get; set; }
        public Location Location { get; set; }

        public string PriceLevel {
            get
            {
                string priceLevelName = "Unknown";
                switch (this.priceLevel)
                {
                    case "PRICE_LEVEL_FREE":
                        priceLevelName = "Free";
                        break;
                    case "PRICE_LEVEL_INEXPENSIVE":
                        priceLevelName = "Inexpensive";
                        break;
                    case "PRICE_LEVEL_MODERATE":
                        priceLevelName = "Moderate";
                        break;
                    case "PRICE_LEVEL_EXPENSIVE":
                        priceLevelName = "Expensive";
                        break;
                    case "PRICE_LEVEL_VERY_EXPENSIVE":
                        priceLevelName = "VeryExpensive";
                        break;
                }

                return priceLevelName;
            }
        }

        public string priceLevel { get; set; }

    }

    public class DisplayName
    {
        public string Text { get; set; }
        public string LanguageCode { get; set; }
    }


    public class AddressComponent
    {
        [JsonProperty("long_name")]
        public string LongName { get; set; }

        [JsonProperty("short_name")]
        public string ShortName { get; set; }

        [JsonProperty("types")]
        public List<string> Types { get; set; }
    }

    public class Bounds
    {
        [JsonProperty("northeast")]
        public Northeast Northeast { get; set; }

        [JsonProperty("southwest")]
        public Southwest Southwest { get; set; }
    }

    public class Geometry
    {
        [JsonProperty("bounds")]
        public Bounds Bounds { get; set; }

        [JsonProperty("location")]
        public Location Location { get; set; }

        [JsonProperty("location_type")]
        public string LocationType { get; set; }

        [JsonProperty("viewport")]
        public Viewport Viewport { get; set; }
    }

    public class Location
    {
        [JsonProperty("latitude")]
        public double Latitude { get; set; }

        [JsonProperty("longitude")]
        public double Longitude { get; set; }
    }

    public class Northeast
    {
        [JsonProperty("lat")]
        public double Lat { get; set; }

        [JsonProperty("lng")]
        public double Lng { get; set; }
    }

    public class Result
    {
        [JsonProperty("address_components")]
        public List<AddressComponent> AddressComponents { get; set; }

        [JsonProperty("formatted_address")]
        public string FormattedAddress { get; set; }

        [JsonProperty("geometry")]
        public Geometry Geometry { get; set; }

        [JsonProperty("place_id")]
        public string PlaceId { get; set; }

        [JsonProperty("types")]
        public List<string> Types { get; set; }
    }

    public class GeocodeResult
    {
        [JsonProperty("results")]
        public List<Result> Results { get; set; }

        [JsonProperty("status")]
        public string Status { get; set; }
    }

    public class Southwest
    {
        [JsonProperty("lat")]
        public double Lat { get; set; }

        [JsonProperty("lng")]
        public double Lng { get; set; }
    }

    public class Viewport
    {
        [JsonProperty("northeast")]
        public Northeast Northeast { get; set; }

        [JsonProperty("southwest")]
        public Southwest Southwest { get; set; }
    }

    public class Coordinates
    {
        public double Latitude { get; private set; }
        public double Longitude { get; private set; }

        public Coordinates(double latitude, double longitude)
        {
            Latitude = latitude;
            Longitude = longitude;
        }
    }
    public static class CoordinatesDistanceExtensions
    {
        public static double DistanceTo(this Coordinates baseCoordinates, Coordinates targetCoordinates)
        {
            return DistanceTo(baseCoordinates, targetCoordinates, UnitOfLength.Kilometers);
        }

        public static double DistanceTo(this Coordinates baseCoordinates, Coordinates targetCoordinates, UnitOfLength unitOfLength)
        {
            var baseRad = Math.PI * baseCoordinates.Latitude / 180;
            var targetRad = Math.PI * targetCoordinates.Latitude / 180;
            var theta = baseCoordinates.Longitude - targetCoordinates.Longitude;
            var thetaRad = Math.PI * theta / 180;

            double dist =
                Math.Sin(baseRad) * Math.Sin(targetRad) + Math.Cos(baseRad) *
                Math.Cos(targetRad) * Math.Cos(thetaRad);
            dist = Math.Acos(dist);

            dist = dist * 180 / Math.PI;
            dist = dist * 60 * 1.1515;

            return unitOfLength.ConvertFromMiles(dist);
        }
    }

    public class UnitOfLength
    {
        public static UnitOfLength Kilometers = new UnitOfLength(1.609344);
        public static UnitOfLength NauticalMiles = new UnitOfLength(0.8684);
        public static UnitOfLength Miles = new UnitOfLength(1);

        private readonly double _fromMilesFactor;

        private UnitOfLength(double fromMilesFactor)
        {
            _fromMilesFactor = fromMilesFactor;
        }

        public double ConvertFromMiles(double input)
        {
            return input * _fromMilesFactor;
        }
    }
}
