using TravelfinderAPI.GmpGis;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using TravelfinderAPI.Functions;
using Microsoft.Extensions.Caching.Memory;

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
        private readonly IMemoryCache _cache;

        public MapController(ILogger<ChatController> logger, IConfiguration configuration, IMemoryCache cache)
        {
            _logger = logger;
            _openAiKey = configuration["GMPGIS_API_KEY"];
            _enableProxy = Convert.ToBoolean(configuration["ENABLE_PROXY"]);
            _cache = cache;
        }

        [HttpGet]
        [Route("NearPoint")]
        public async Task<ActionResult> NearPoint(string requestId, double latitude, double longitude, string languageCode, int radius, int pageSize = 20)
        {
            var apiClient = new GmpGisApiClient(_openAiKey, _enableProxy);

            var planInfo = _cache.Get<PlanInfo>(requestId);

            var result = await apiClient.NearPoint(latitude, longitude, radius, languageCode, pageSize, planInfo != null ? planInfo.Categories : new string[] { });

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
