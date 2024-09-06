using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net;
using TravelfinderAPI.Functions;
using Newtonsoft.Json;
using System.Reflection.Metadata.Ecma335;
using System;
using System.Reflection;
using System.Text;

namespace TravelfinderAPI
{

    public class OpenAIApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly ArcGisApiClient _arcGisApiClient;

        public double Latitude { get; set; }
        public double Longitude { get; set; }

        public OpenAIApiClient(string apiKey, bool enableProxy, ArcGisApiClient arcGisApiClient)
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

                _httpClient = new HttpClient(handler: httpClientHandler, disposeHandler: true);
            }
            else
            {
                _httpClient = new HttpClient();
            }

            _apiKey = apiKey;
            _httpClient.BaseAddress = new Uri("https://travelfinder.openai.azure.com/openai/deployments/GisHelper/");

            _arcGisApiClient = arcGisApiClient;
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

        public async Task<StaticCompletion> SendCommands(Message[] messages, double latitude, double longitude, string apiKey = "")
        {
            var requestBody = new
            {
                messages = messages,
                stream = false,
/*             
                tools = new Tool[] {
                    
                    new Tool()
                    {
                        Function = new Function()
                        {
                            Name = "QueryFeature",
                            Description = "return TravelPlace created by user.",
                            Parameters = new Parameters()
                            {
                                Properties = new Dictionary<string, Property>()
                                {
                                    {
                                        "record_count", new Property() { Type = "string", Description = "the count of TravelPlace records should be included." }
                                    },
                                    {
                                        "category_type", new Property() { Type = "string", Description = "the category of the TravelPlace record."}
                                    }
                                },
                                Required = new List<string>(){ "record_count" }
                            }

                        }
                    },
                    new Tool()
                    {
                        Function = new Function()
                        {
                            Name = "GeocodeAddress",
                            Description = "get latitude and longitude based on the address",
                            Parameters = new Parameters()
                            {
                                Properties = new Dictionary<string, Property>()
                                {
                                    {
                                        "address", new Property() { Type = "string", Description = "the address that need to be geocoded" }
                                    }
                                },
                                Required = new List<string>(){"address"}
                            }
                        }
                    }

                }
*/
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

                            var featureResult = await _arcGisApiClient.Query(geometry, where, 5000, 0, record_count);

                            choice.Message.Content = JsonConvert.SerializeObject(featureResult);
                            break;
                            
                    }
                }
            }

            return staticCompletion;
        }
    }

    public class Message
    {
        [JsonProperty("role")]
        public string Role { get; set; }

        [JsonProperty("content")]
        public string Content { get; set; }

        [JsonIgnore]
        public ToolCall[]? ToolCalls { get; set; }
    }

    public class Choice
    {
        public Message Delta { get; set; }
        public int Index { get; set; }
        public string FinishReason { get; set; }
        public int TokenLength { get; set; }
    }

    public class StaticChoice
    {
        public Message Message { get; set; }
        public int Index { get; set; }
        public string FinishReason { get; set; }
        public int TokenLength { get; set; }
    }

    public class Completion
    {
        public string Id { get; set; }
        public string Object { get; set; }
        public string Model { get; set; }
        public Choice[] Choices { get; set; }
    }

    public class StaticCompletion
    {
        public string Id { get; set; }
        public string Object { get; set; }
        public string Model { get; set; }

        public StaticChoice[] Choices { get; set; }
    }

    public class MessageRequest
    {
        public string SystemId { get; set; }
        public List<Message> Messages { get; set; }

        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

    public class PromotTemplate
    {
        public string Id { get; set; }
        public string Promot { get; set; }
    }

    public class Plan
    {
        public string FormattedAddress { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Name { get; set; }
        public int Number { get; set; }
        public string SuggestReason { get; set; }
        public string Hint { get; set; }
    }

    public class Hint
    {
        public GmpGis.Place[] Source { get; set; }
        public Plan[] Target { get; set; }
    }

}
