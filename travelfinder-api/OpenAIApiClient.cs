using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net;
using TravelfinderAPI.Functions;
using Newtonsoft.Json;

namespace TravelfinderAPI
{

    public class OpenAIApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public double Latitude { get; set; }
        public double Longitude { get; set; }

        public OpenAIApiClient(string apiKey, bool enableProxy)
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
            _httpClient.BaseAddress = new Uri("https://api.openai.com/v1/");
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
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

        public async Task<StaticCompletion> SendCommands(Message[] messages, string apiKey = "", string model = "gpt-3.5-turbo")
        {
            var requestBody = new
            {
                model = model,
                messages = messages,
                stream = false,
                /*
                tools = new Tool[] {
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

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
            {
                Content = JsonContent.Create(requestBody)
            };

            Debug.WriteLine(Newtonsoft.Json.JsonConvert.SerializeObject(requestBody));

            StaticCompletion completion =new StaticCompletion();
            string responseBody = null;
            try
            {
                // HttpCompletionOption.ResponseHeadersRead is important, otherwise it won't stream
                var response = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead);
                response.EnsureSuccessStatusCode();
                responseBody = await response.Content.ReadAsStringAsync();

                completion = JsonConvert.DeserializeObject<StaticCompletion>(responseBody);
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
    }

    public class Message
    {
        [JsonProperty("role")]
        public string Role { get; set; }

        [JsonProperty("content")]
        public string Content { get; set; }

        //[JsonProperty("tool_calls")]
        //public ToolCall[] ToolCalls { get; set; }
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
}
