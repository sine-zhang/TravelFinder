using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net;
using TravelfinderAPI.Functions;
using Newtonsoft.Json;
using System.Reflection.Metadata.Ecma335;
using System;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using TravelfinderAPI.GmpGis;
using Microsoft.Extensions.Caching.Memory;

namespace TravelfinderAPI
{

    public class AzureAIApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly ArcGisApiClient _arcGisApiClient;
        private readonly GmpGisApiClient _gmpGisApiClient;
        private readonly PromotTemplate[] _promotTemplates;
        private readonly IMemoryCache _cache;

        public double Latitude { get; set; }
        public double Longitude { get; set; }

        public AzureAIApiClient(string apiKey, bool enableProxy, ArcGisApiClient arcGisApiClient, PromotTemplate[] promotTemplates, GmpGisApiClient gmpGisApiClient, IMemoryCache cache)
        {
            if(enableProxy)
            {
                var proxy = new WebProxy
                {
                    Address = new Uri($"http://127.0.0.1:2084"),
                    BypassProxyOnLocal = false,
                    UseDefaultCredentials = false,
                };

                var httpClientHandler = new HttpClientHandler
                {
                    Proxy = proxy,
                };

                httpClientHandler.ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => { return true; };

                _httpClient = new HttpClient(handler: httpClientHandler, disposeHandler: true);
            }
            else
            {
                _httpClient = new HttpClient();
            }

            _apiKey = apiKey;
            _httpClient.BaseAddress = new Uri("https://travelfinder.openai.azure.com/openai/deployments/gpt-4-2/");

            _arcGisApiClient = arcGisApiClient;
            _promotTemplates = promotTemplates;
            _gmpGisApiClient = gmpGisApiClient;

            _cache = cache;
        }

        public async Task<Stream> SendPromptStream(string prompt, string apiKey = "", string model = "gpt-3.5-turbo")
        {
            var requestBody = new
            {
                model = model,
                messages = new Message[] { new Message { Role = "user", Content = prompt } },
                stream = true
            };

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
            {
                Content = JsonContent.Create(requestBody)
            };
            
            Debug.WriteLine(Newtonsoft.Json.JsonConvert.SerializeObject(requestBody));

            // HttpCompletionOption.ResponseHeadersRead is important, otherwise it won't stream
            if(apiKey != string.Empty)
            {
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            }
            var response = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();
            var responseBody = await response.Content.ReadAsStreamAsync();


            return responseBody;
        }

        public async Task<string> SendPrompt(string prompt, string model = "gpt-3.5-turbo")
        {
            var requestBody = new
            {
                prompt = prompt,
                model = model,
                max_tokens = 2000,
                temperature = 0.5,
                stream = true
            };

            var response = await _httpClient.PostAsJsonAsync("completions", requestBody);
            response.EnsureSuccessStatusCode();
            var responseBody = await response.Content.ReadAsStringAsync();

            return responseBody;
        }

        public async Task<Stream> SendStreamCommand(CommandOptions options)
        {
            var requestBody = new
            {
                messages = options.Messages,
                stream = true,
                tools = options.Tools
            };

            var requestJson = JsonConvert.SerializeObject(requestBody, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore
            });

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, "chat/completions?api-version=2023-03-15-preview")
            {
                Content = new StringContent(requestJson, Encoding.UTF8,"application/json")
            };

            Debug.WriteLine(Newtonsoft.Json.JsonConvert.SerializeObject(requestBody));

            requestMessage.Headers.Add("api-key", _apiKey);
            var responseStream = Stream.Null;
            try
            {
                // HttpCompletionOption.ResponseHeadersRead is important, otherwise it won't stream
                var response = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead);
                response.EnsureSuccessStatusCode();
                responseStream = await response.Content.ReadAsStreamAsync();
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex.Message);
            }

            return responseStream;
        }
        
        public async Task<StaticCompletion> SendCommands(Message[] messages, double latitude, double longitude, string apiKey = "")
        {
            var requestBody = new
            {
                messages = messages,
                stream = false
            };

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, "chat/completions?api-version=2023-03-15-preview")
            {
                Content = new StringContent(JsonConvert.SerializeObject(requestBody),Encoding.UTF8,"application/json")
            };

            requestMessage.Headers.Add("api-key", _apiKey);

            Debug.WriteLine(Newtonsoft.Json.JsonConvert.SerializeObject(requestBody));

            StaticCompletion completion = new StaticCompletion();
            string responseBody = null;
            try
            {

                var response = await _httpClient.SendAsync(requestMessage);
                response.EnsureSuccessStatusCode();
                responseBody = await response.Content.ReadAsStringAsync();

                completion = JsonConvert.DeserializeObject<StaticCompletion>(responseBody);

                completion = await ExecuteFunction(completion, latitude, longitude);
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex.Message);
            }

            return completion;
        }

        public async Task<Stream> SendMessages(Message[] messages, string apiKey = "", string model = "gpt-3.5-turbo")
        {
            var requestBody = new
            {
                model = model,
                messages = messages,
                stream = true
            };

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
            {
                Content = JsonContent.Create(requestBody)
            };

            Debug.WriteLine(Newtonsoft.Json.JsonConvert.SerializeObject(requestBody));

            Stream responseBody = null;
            try
            {
                // HttpCompletionOption.ResponseHeadersRead is important, otherwise it won't stream
                var response = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead);
                response.EnsureSuccessStatusCode();
                responseBody = await response.Content.ReadAsStreamAsync();
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex.Message);
            }

            return responseBody;
        }

        public async Task<PlanInfo> GetPlanInfo(MessageRequest messageRequest, bool useCache = false, string systemId = "get_plan_info")
        {
            var planInfo = new PlanInfo();

            if (useCache)
            {
                planInfo = _cache.Get<PlanInfo>(messageRequest.RequestId);
                return planInfo;
            }

            var systemMessage = _promotTemplates.First(x => x.Id == systemId);

            var geocodedResult = await _gmpGisApiClient.ReverseGeocode(messageRequest.Latitude, messageRequest.Longitude);
            var geocodedArea = geocodedResult.Results.Select(result => result.FormattedAddress).FirstOrDefault();
            systemMessage.Promot = systemMessage.Promot.Replace("__AREA__", geocodedArea ?? "N/A");
            var allMessages = messageRequest.Messages.Prepend(new Message() { Role = "system", Content = systemMessage.Promot }).ToList();

            var requestBody = new
            {
                messages = allMessages.ToArray(),
                stream = false,
                tools = systemMessage.Tools
            };

            var requestJson = JsonConvert.SerializeObject(requestBody, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore
            });

            Debug.WriteLine(requestJson);

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, "chat/completions?api-version=2023-03-15-preview")
            {
                Content = new StringContent(requestJson, Encoding.UTF8, "application/json")
            };

            requestMessage.Headers.Add("api-key", _apiKey);

            StaticCompletion completion = new StaticCompletion();
            string responseBody = null;
            try
            {
                var response = await _httpClient.SendAsync(requestMessage);
                response.EnsureSuccessStatusCode();
                responseBody = await response.Content.ReadAsStringAsync();

                completion = JsonConvert.DeserializeObject<StaticCompletion>(responseBody);

                var staticChoice = completion.Choices.FirstOrDefault();
                
                if (staticChoice.Message.ToolCalls?.Length > 0)
                {
                    var toolCall = staticChoice.Message.ToolCalls.FirstOrDefault();

                    planInfo = JsonConvert.DeserializeObject<PlanInfo>(toolCall.Function.ArgumentsContent);

                    _cache.Set(messageRequest.RequestId, planInfo);
                }
                else if (!string.IsNullOrEmpty(staticChoice.Message.Content))
                {
                    planInfo = new PlanInfo();
                    planInfo.Refinement = staticChoice.Message.Content;
                }
            }
            catch (Exception ex)
            {
                planInfo = new PlanInfo()
                {
                    BudgetLevel = new string[] { "Moderate" },
                    Language = "en-us",
                    Categories = new string[] { "park", "restaurant", "art_gallery", "museum", "historical_landmark", "cafe", "bar", "library", "night_club", "store", "jewelry_store" }
                };

                Debug.WriteLine(ex.Message);
            }

            return planInfo;
        }



        private async Task<StaticCompletion> ExecuteFunction(StaticCompletion staticCompletion, double latitude, double longitude)
        {
            foreach(var choice in staticCompletion.Choices)
            {
                if (choice.Message.ToolCalls is null)
                {
                    continue;
                }

                foreach(var toolCall in choice.Message.ToolCalls)
                {
                    switch(toolCall.Function.Name)
                    {
                        case "QueryFeature":

                            var geometryObj = new
                            {
                                x = longitude,
                                y = latitude,
                                spatialReference = new
                                {
                                    wkid = 4326
                                }
                            };
                            var geometry = JsonConvert.SerializeObject(geometryObj);

                            var record_count = toolCall.Function.Arguments.ContainsKey("record_count") ? Convert.ToInt32(toolCall.Function.Arguments["record_count"]) : 50;
                            var category_type = toolCall.Function.Arguments.ContainsKey("category_type") ? toolCall.Function.Arguments["category_type"].ToString() : string.Empty;
                            var where = "1=1";

                            if (!string.IsNullOrEmpty(category_type))
                            {
                                where = $"Category LIKE '%{category_type}%'";
                            }

                            var featureResult = await _arcGisApiClient.Query(geometry, 4326, where, 5000, 0, record_count);

                            choice.Message.Content = JsonConvert.SerializeObject(featureResult);
                            break;
                            
                    }
                }
            }

            return staticCompletion;
        }
    }
}
