FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env

WORKDIR /src
COPY ["./TravelfinderAPI/TravelfinderAPI.csproj", "./TravelfinderAPI/"]

RUN dotnet restore "./TravelfinderAPI/TravelfinderAPI.csproj"

#bundle app's source code inside the Docker image
COPY . .

RUN dotnet publish "./TravelfinderAPI/TravelfinderAPI.csproj" -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:7.0

#ENV http_proxy http://192.168.1.12:2084
#ENV https_proxy http://192.168.1.12:2084
ENV ASPNETCORE_ENVIRONMENT Production

WORKDIR /app
COPY --from=build-env /app .

ENTRYPOINT ["dotnet", "TravelfinderAPI.dll","--environment=Production"]