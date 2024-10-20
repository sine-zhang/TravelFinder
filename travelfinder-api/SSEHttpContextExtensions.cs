public static class SSEHttpContextExtensions
{
    public static async Task SSEInitAsync(this HttpContext ctx)
    {
        ctx.Response.Headers.Add("Content-Type", "text/event-stream");
        ctx.Response.Headers.Add("Cache-Control", "no-cache");
        ctx.Response.Headers.Add("Connection", "keep-alive");
        ctx.Response.Headers.Add("Access-Control-Allow-Origin", "*");
        await ctx.Response.Body.FlushAsync();
    }

    public static async Task SSESendDataAsync(this HttpContext ctx, string data)
    {
        foreach (var line in data.Split('\n'))
            await ctx.Response.WriteAsync(line);

        await ctx.Response.Body.FlushAsync();
    }

    public static async Task SSESendEventAsync(this HttpContext ctx, string eventName, string data)
    {
        await ctx.Response.WriteAsync("event: " + eventName + "\n");
        await ctx.SSESendDataAsync(data);
    }
}