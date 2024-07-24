using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace TravelfinderAPI.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class GisController : ControllerBase
    {
        private readonly ILogger<ChatController> _logger;
        private string _openAiKey;
        private PromotTemplate[] _promotTemplate;
        private readonly bool _enableProxy;
        private readonly string _proxyAddress;

        public GisController(ILogger<ChatController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _openAiKey = configuration["ARCGIS_API_KEY"];
            _enableProxy = Convert.ToBoolean(configuration["ENABLE_PROXY"]);
            _proxyAddress = configuration["PROXY_ADDRESS"];
            _promotTemplate = configuration.GetSection("PROMOT_TEMPLATE").Get<PromotTemplate[]>();
        }

        [HttpGet]
        public async Task<string> Get(double x, double y, int radius, int pageSize=20)
        {
            var arcGisApiClient = new ArcGisApiClient(_openAiKey, _enableProxy, _proxyAddress);

            var result = await arcGisApiClient.NearPoint(x, y, radius, new int[] { 16026 }, pageSize);

            return JsonConvert.SerializeObject(result);
        }
    }
}
