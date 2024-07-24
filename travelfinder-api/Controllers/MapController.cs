using TravelfinderAPI.GmpGis;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

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
        private readonly string _proxyAddress;

        public MapController(ILogger<ChatController> logger, IConfiguration configuration, string proxyAddress)
        {
            _logger = logger;
            _openAiKey = configuration["GMPGIS_API_KEY"];
            _enableProxy = Convert.ToBoolean(configuration["ENABLE_PROXY"]);
            _proxyAddress = configuration["PROXY_ADDRESS"];
        }

        [HttpGet]
        [Route("NearPoint")]
        public async Task<ActionResult> NearPoint(double latitude, double longitude, string languageCode, int radius, int pageSize = 20)
        {
            var apiClient = new GmpGisApiClient(_openAiKey, _enableProxy, _proxyAddress);

            var result = await apiClient.NearPoint(latitude, longitude, radius, languageCode, pageSize);

            return Ok(JsonConvert.SerializeObject(result));
        }

        [HttpGet]
        [Route("Geocode")]
        public async Task<ActionResult> Geocode(string address)
        {
            var apiClient = new GmpGisApiClient(_openAiKey, _enableProxy, _proxyAddress);

            var result = await apiClient.Geocode(address);

            return Ok(JsonConvert.SerializeObject(result));
        }
    }
}
