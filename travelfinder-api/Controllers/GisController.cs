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
        private readonly ArcGisApiClient _arcGisApiClient;

        public GisController(ILogger<ChatController> logger, IConfiguration configuration)
        {
            _logger = logger;
            _openAiKey = configuration["ARCGIS_API_KEY"];
            _enableProxy = Convert.ToBoolean(configuration["ENABLE_PROXY"]);
            _promotTemplate = configuration.GetSection("PROMOT_TEMPLATE").Get<PromotTemplate[]>();

            var featureLayers = configuration.GetSection("FEATURE_LAYER").Get<string[]>();
            var pointLayerUrl = featureLayers[1];

            _arcGisApiClient = new ArcGisApiClient(_openAiKey, _enableProxy, pointLayerUrl);
        }

        [HttpGet]
        [Route("NearPoint")]
        public async Task<string> Get(double x, double y, int radius, int pageSize=20)
        {
            var result = await _arcGisApiClient.NearPoint(x, y, radius, new int[] { 16026 }, pageSize);

            return JsonConvert.SerializeObject(result);
        }

        [HttpPost]
        [Route("ApplyEdits")]
        public async Task<ActionResult> ApplyEdits([FromBody] ApplyEditRequest request)
        {
            var result = await _arcGisApiClient.ApplyEdits(request.adds);
            return Ok(JsonConvert.SerializeObject(result));
        }
    }
}
