using TravelfinderAPI;
using TravelfinderAPI.GmpGis;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddScoped<GmpGisApiClient>(services =>
{
    var configuration = services.GetService<IConfiguration>() ?? throw new InvalidOperationException("Configuration not found");

    var apiKey = configuration["GMPGIS_API_KEY"] ?? "";
    var isProxy = bool.TryParse(configuration["ENABLE_PROXY"], out var enableProxy) && enableProxy;
    var proxyAddress = configuration["PROXY_ADDRESS"] ?? "";

    return new GmpGisApiClient(apiKey, isProxy, proxyAddress);
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(x => x.AddPolicy("AllowAll", builder =>
{
    builder.AllowAnyOrigin()
           .AllowAnyMethod()
           .AllowAnyHeader();
}));

var app = builder.Build();

app.UseCors(builder =>
{
    builder
       .WithOrigins("http://localhost:4200", "https://localhost:4200", "https://chat.x-rank.com", "http://localhost:8100", "http://localhost:45541")
       .SetIsOriginAllowedToAllowWildcardSubdomains()
       .AllowAnyHeader()
       .AllowCredentials()
       .WithMethods("GET", "PUT", "POST", "DELETE", "OPTIONS")
       .SetPreflightMaxAge(TimeSpan.FromSeconds(3600));
}
);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();


app.MapControllerRoute("default", "{controller=Home}/{action=index}/{id?}");


app.Run();
