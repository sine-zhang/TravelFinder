// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  ARCGIS_API_KEY:"AAPK4720ce2614b54be0833c9d675ad31ca2L8Lj5dSqqpc1iZx1-ZBv3cAY6DbzBlZ_P9Ql_9VOsR7FsWC8HGn9EDuRCswWbnZQ",
  API_URL:"http://localhost:1294",
  ROUTE_URL:"https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World",
  VRP_URL: "https://logistics.arcgis.com/arcgis/rest/services/World/VehicleRoutingProblem/GPServer/SolveVehicleRoutingProblem",
  GEOCODE_URL: "http://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer",
  MAX_SCALE:50000,
  WK_ID: 4326
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
