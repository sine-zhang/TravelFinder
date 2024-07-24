using TravelfinderAPI.GmpGis;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http.Headers;
using TiktokenSharp;

namespace TravelfinderAPI.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ChatController : ControllerBase
    {
        private GmpGisApiClient _gmpGisApiClient;
        private readonly ILogger<ChatController> _logger;
        private string _openAiKey;
        private PromotTemplate[] _promotTemplate;
        private readonly bool _enableProxy;
        private readonly string _proxyAddress;
        public ChatController(ILogger<ChatController> logger, IConfiguration configuration, GmpGisApiClient gmpGisApiClient)
        {
            _logger = logger;
            _openAiKey = configuration["OPENAI_API_KEY"];
            _enableProxy = Convert.ToBoolean(configuration["ENABLE_PROXY"]);
            _promotTemplate = configuration.GetSection("PROMOT_TEMPLATE").Get<PromotTemplate[]>();
            _proxyAddress = configuration["PROXY_ADDRESS"];
            _gmpGisApiClient = gmpGisApiClient;
        }

        [HttpGet]
        public async Task Get(string prompt)
        {
            await HttpContext.SSEInitAsync();

            var openAiClient = new OpenAIApiClient(_openAiKey, _enableProxy, _proxyAddress);

            var responseStream = await openAiClient.SendPromptStream(prompt);

            using (var reader = new StreamReader(responseStream))
            {
                while (!reader.EndOfStream)
                {
                    string data = reader.ReadLine();
                    
                    await HttpContext.SSESendDataAsync(data);
                }
            }

        }

        [HttpPost]
        [Route("Command")]
        public async Task<ActionResult> Command([FromBody] MessageRequest messageRequest)
        {

            var apiKey = Request.Headers["Joi-ApiKey"];

            if (!string.IsNullOrEmpty(apiKey))
            {
                _openAiKey = apiKey;
            }

            var placeResult = await _gmpGisApiClient.NearPoint(messageRequest.Latitude, messageRequest.Longitude, 1000, "en-us", 20);

            var openAiClient = new OpenAIApiClient(_openAiKey, _enableProxy, _proxyAddress);

            var messages = messageRequest.Messages;
            var systemMessage = _promotTemplate.FirstOrDefault(x => x.Id == messageRequest.SystemId);

            var promot = systemMessage == null ? "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown format." : systemMessage.Promot;

            messages = messages.Prepend(new Message()
            {
                Role = "assistant",
                Content = "Sure, please provide further description."
            }).Prepend(new Message()
            {
                Role = "user",
                Content = "These are alternative locations: " + JsonConvert.SerializeObject(placeResult)
            }).Prepend(new Message()
            {
                Role = "system",
                Content = promot
            })
            .ToList();

            var completion = await openAiClient.SendCommands(messages.ToArray());

            return Ok(JsonConvert.SerializeObject(completion));

        }

        [HttpPost]
        [Route("Post")]
        public async Task Post([FromBody] MessageRequest messageRequest)
        {
            await HttpContext.SSEInitAsync();

            _openAiKey = Request.Headers["Joi-ApiKey"];

            var openAiClient = new OpenAIApiClient(_openAiKey, _enableProxy, _proxyAddress);

            var messages = messageRequest.Messages;
            var systemMessage = _promotTemplate.FirstOrDefault(x => x.Id == messageRequest.SystemId);

            messages = messages.Prepend(new Message()
            {
                Role = "system",
                Content = systemMessage == null ? "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown format." : systemMessage.Promot
            }).ToList();
            
            var responseStream = await openAiClient.SendMessages(messages.ToArray());

            var tiktoken = TikToken.EncodingForModel("gpt-3.5-turbo");
            string completeMessage = string.Empty;

            using (var reader = new StreamReader(responseStream))
            {
                while (!reader.EndOfStream)
                {
                    string data = reader.ReadLine();

                    data = data.Replace("data: ", "").Trim();

                    if (string.IsNullOrWhiteSpace(data)) continue;

                    Completion obj = null;
                    
                    if(data == "[DONE]")
                    {
                        obj = new Completion()
                        {
                            Choices = new Choice[]
                            {
                                new Choice()
                                {
                                    FinishReason = "stop",
                                    TokenLength = tiktoken.Encode(completeMessage).Count
                                }
                            }
                        };
                    }
                    else
                    {
                        obj = JsonConvert.DeserializeObject<Completion>(data);

                        Array.ForEach(obj.Choices, (item) =>
                        {
                            if (string.IsNullOrWhiteSpace(item.Delta.Content)) return;
                            if (item.FinishReason == "stop")
                            {
                                item.TokenLength = tiktoken.Encode(completeMessage).Count;
                            }

                            completeMessage += item.Delta.Content;
                        });

                    }

                    var serializerSettings = new JsonSerializerSettings();
                    serializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
                    data = JsonConvert.SerializeObject(obj, serializerSettings);
                    
                    await HttpContext.SSESendDataAsync(data);
                }
            }

        }

    }

}