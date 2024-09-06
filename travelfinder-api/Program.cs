using TravelfinderAPI;
using TravelfinderAPI.GmpGis;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddScoped<GmpGisApiClient>(services =>
{
    var configuration = services.GetService<IConfiguration>();

    var apiKey = configuration != null ? configuration["GMPGIS_API_KEY"] : "";
    var enableProxy = configuration != null ? configuration["ENABLE_PROXY"] : "";
    var isProxy = Convert.ToBoolean(enableProxy);

    return new GmpGisApiClient(apiKey, isProxy);
});

builder.Services.AddScoped<ArcGisApiClient>(services =>
{
    var configuration = services.GetService<IConfiguration>();

    var apiKey = configuration != null ? configuration["ARCGIS_API_KEY"] : "";
    var enableProxy = configuration != null ? configuration["ENABLE_PROXY"] : "";
    var isProxy = Convert.ToBoolean(enableProxy);

    var featureLayers = configuration.GetSection("FEATURE_LAYER").Get<string[]>();
    var pointLayerUrl = featureLayers[1];

    return new ArcGisApiClient(apiKey, isProxy, pointLayerUrl);
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
