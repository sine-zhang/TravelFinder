using System.Net.Http;
using System.Net;

namespace TravelfinderAPI
{
    public static class Utils
    {
        public static HttpClient CreateProxy(string proxyAddress)
        {
            var proxy = new WebProxy
            {
                Address = new Uri(proxyAddress),
                BypassProxyOnLocal = false,
                UseDefaultCredentials = false,
            };

            var httpClientHandler = new HttpClientHandler
            {
                Proxy = proxy,
            };

            var httpClient = new HttpClient(handler: httpClientHandler, disposeHandler: true);

            return httpClient;
        }
    }
}
