using TravelfinderAPI.GmpGis;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using TravelfinderAPI.Functions;

namespace TravelfinderAPI.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MapController : Controller
    {
        private readonly ILogger<ChatController> _logger;
        private string _openAiKey;
        private PromotTemplate[] _promotTemplate;
        private readonly bool _enableProxy;

        public MapController(ILogger<ChatController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _openAiKey = configuration["GMPGIS_API_KEY"];
            _enableProxy = Convert.ToBoolean(configuration["ENABLE_PROXY"]);
        }

        [HttpGet]
        [Route("NearPoint")]
        public async Task<ActionResult> NearPoint(double latitude, double longitude, string languageCode, int radius, int pageSize = 20)
        {
            var apiClient = new GmpGisApiClient(_openAiKey, _enableProxy);

            var result = await apiClient.NearPoint(latitude, longitude, radius, languageCode, pageSize, new string[] { });

            return Ok(JsonConvert.SerializeObject(result));
        }

        [HttpGet]
        [Route("Geocode")]
        public async Task<ActionResult> Geocode(string address)
        {
            var apiClient = new GmpGisApiClient(_openAiKey, _enableProxy);

            var result = await apiClient.Geocode(address);

            return Ok(JsonConvert.SerializeObject(result));
        }


        [HttpGet]
        [Route("ReverseGeocode")]
        public async Task<ActionResult> ReverseGeocode(double latitude, double longitude)
        {
            var apiClient = new GmpGisApiClient(_openAiKey, _enableProxy);

            var result = await apiClient.ReverseGeocode(latitude, longitude);

            return Ok(JsonConvert.SerializeObject(result));
        }
    }
}
