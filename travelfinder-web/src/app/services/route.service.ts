import { Injectable } from '@angular/core';
import Point from '@arcgis/core/geometry/Point';
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import * as Route from "@arcgis/core/rest/route";
import * as geoprocessor from "@arcgis/core/rest/geoprocessor";
import Stop from "@arcgis/core/rest/support/Stop";
import Collection from "@arcgis/core/core/Collection";
import * as networkService from "@arcgis/core/rest/networkService";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import CIMSymbol from "@arcgis/core/symbols/CIMSymbol";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import { Observable, from } from 'rxjs';
import { Place } from './api.service';
import { environment } from 'src/environments/environment';
import { Helper } from '../shared/helper';


@Injectable({
  providedIn: 'root'
})
export class RouteService {

  constructor(private helper: Helper) { }

  createEmptyStopLayer(index:number = -1) {
    const layerName = index != -1 ? `stop_layer_${index}` : "stop_layer";

    let layer = new GraphicsLayer({
      id: layerName
    });

    return layer;
  }

  createEmptyRouteLayer(index:number = -1) {
    const layerName = index != -1 ? `route_layer_${index}` : "route_layer";

    let layer = new GraphicsLayer({
      id: layerName
    });

    return layer;
  }

  async createStopGraphic(places: Place[]) {
    const graphics = [];

    for(const place of places) {
      let symbol:any = await this.createIconSymbol(place);
      const graphic = new Graphic({
        symbol: symbol,
        geometry: new Point({
          latitude: place.location.latitude,
          longitude: place.location.longitude
        }),
        attributes: {
          Name: place.name,
          Day: place.day,
          Number: place.number,
          Sequence: 0,
          PrimaryType: place.primaryType,
          Cumul_TravelTime: 0,
          Cumul_Kilometers: 0
        },
        popupTemplate: this.createPopTemplate(place)
      });

      graphics.push(graphic);
    }

    return graphics;
  }

  async upsertStopLayer(stopLayer:GraphicsLayer, places: Place[]) {
    let graphics = await this.createStopGraphic(places);
    stopLayer.graphics.addMany(graphics);
  }

  async createStopLayer(places: Place[], attributes:any=null) {
    let layer = this.createEmptyStopLayer();
    let graphics = await this.createStopGraphic(places);

    layer.graphics.addMany(graphics);
    return layer;
  }

  cloneStopLayer(stopLayer: GraphicsLayer) { 
    let layer = this.createEmptyStopLayer();
    let graphics = stopLayer.graphics.map(graphic => {
      return new Graphic({
        symbol: graphic.symbol,
        geometry: graphic.geometry,
        attributes: graphic.attributes,
        popupTemplate: graphic.popupTemplate
      });
    });

    layer.graphics.addMany(graphics);
    return layer;
  }
  
  createVrpParam(stopLayer: StopLayer): VrpParam {
    const firstDepotGraphic = stopLayer.layer.graphics.reduce((m, x) => m.attributes.Number > x.attributes.Number ? m : x);
    const lastDepotGraphic = stopLayer.layer.graphics.reduce((m, x) => m.attributes.Number < x.attributes.Number ? m : x);

    const depots = [
        firstDepotGraphic,
        lastDepotGraphic,
    ];

    const orders = stopLayer.layer.graphics.filter((graphic, index) => [
                                                                        firstDepotGraphic.attributes.Number,
                                                                        lastDepotGraphic.attributes.Number
                                                                       ].includes(graphic.attributes.Number)
                                            ).toArray();

    const route = {
      Name: stopLayer.day,
      Description: `Day ${stopLayer.day }`,
      StartDepotName: firstDepotGraphic?.attributes["Name"],
      EndDepotName: lastDepotGraphic?.attributes["Name"],
      MaxOrderCount: 200,
      MaxTotalTime: null,
      MaxTotalDistance: null,
      Capacities: 2000,
    }

    return {
      depots: depots,
      orders: orders,
      routes: [route]
    };
  }

  createMultiVrpLayer(stopLayers: StopLayer[], planId: string): Observable<GraphicsLayer[]> {
    return new Observable<GraphicsLayer[]>((sub) => {
      let routeLayer = this.createEmptyRouteLayer();
      let stopLayer = this.createEmptyStopLayer();
      
      const vrpParams = stopLayers.map(stopLayer => this.createVrpParam(stopLayer));

      const depots = new FeatureSet({
        features: vrpParams.map(param => param.depots).flat(2)
      });
  
      const orders = new FeatureSet({
        features: vrpParams.map(param => param.orders).flat(2)
      });
  
      const routes = new FeatureSet({
        features: vrpParams.map(param => {
          return {
            attributes: param.routes[0]
          }})
      });

      const params = {
        orders,
        depots,
        routes,
        populate_directions: true
      };

      console.log(params);

      geoprocessor.submitJob(environment.VRP_URL, params).then(async (jobInfo: any) => {
        const options = {
          statusCallback: (info:any) => {
            const timestamp = new Date().toLocaleTimeString();
            const message = info.messages[info.messages.length - 1];
            console.log(`${timestamp}: ${message.description}`);
          }
        };

        await jobInfo.waitForJobCompletion(options);

        const [directionsResult, routesResult, stopsResult] = await Promise.all([
          jobInfo.fetchResultData("out_directions"),
          jobInfo.fetchResultData("out_routes"),
          jobInfo.fetchResultData("out_stops")
        ]);

        console.log(directionsResult, routesResult, stopsResult);

        const outStops = (stopsResult.value as FeatureSet).features;
        const outRoutes = (routesResult.value as FeatureSet).features;

        outRoutes.forEach(outRoute => {
          const simpleLineSymbol = new SimpleLineSymbol({
            cap: "round",
            color: this.helper.getColorByNumber(outRoute.attributes.Name),
            join: "round",
            miterLimit: 1,
            style: "solid",
            width: 4
          });

          outRoute.symbol = simpleLineSymbol;
          outRoute.attributes.id = planId;
        })

        console.log(outStops, outRoutes);

        // TODO: outStops and stopLayers might need to swap.
        stopLayers.forEach(subStopLayer => {
          stopLayer.graphics.addMany(subStopLayer.layer.graphics);
        });
        
        routeLayer.graphics.addMany(outRoutes);

        sub.next([stopLayer, routeLayer]);
        sub.complete();
      });
    });
  }

  createVrpLayer(stopLayer: GraphicsLayer, planId:string): Observable<GraphicsLayer[]> {
    return new Observable<GraphicsLayer[]>((sub) => {
      if (stopLayer.graphics.length > 1) { 
        let routeLayer = this.createEmptyRouteLayer();

        const depots = new FeatureSet({
          features: [
            stopLayer.graphics.getItemAt(0),
            stopLayer.graphics.getItemAt(stopLayer.graphics.length - 1),
          ]
        });

        const orderArray = stopLayer.graphics.filter((_, index) => index != 0 || index != stopLayer.graphics.length - 1)
                                             .toArray();
        const orders = new FeatureSet({
          features: orderArray
        });

        const firstDepotGraphic = depots.features[0];
        const lastDepotGraphic = depots.features[depots.features.length - 1];

        const routes = new FeatureSet({
          features:[{
            attributes:{
              Name: "Route 1",
              Description: "vehicle 1",
              StartDepotName: firstDepotGraphic?.attributes["Name"],
              EndDepotName: lastDepotGraphic?.attributes["Name"]
            }
          }]
        });

        const params = {
          orders,
          depots,
          routes,
          populate_directions: true
        };

        geoprocessor.execute(environment.VRP_URL, params).then(({results}) => {
          console.log(results);

          const outStops = results[1].value.features;
          const outRoutes = results[2].value.features.pop();

          const simpleLineSymbol = new SimpleLineSymbol({
            cap: "round",
            color: "#990F0F",
            join: "round",
            miterLimit: 1,
            style: "solid",
            width: 4
          });

          outRoutes.symbol = simpleLineSymbol;
          outRoutes.attributes = {id: planId};

          routeLayer.graphics.add(outRoutes);

          sub.next([stopLayer, routeLayer]);
          sub.complete();
        });
      }
    });
  }

  createRouteLayer(stopLayer: GraphicsLayer, planId:string): Observable<GraphicsLayer[]>{
    return new Observable<GraphicsLayer[]>((sub) => {
      if (stopLayer.graphics.length > 1) {
        let routeLayer = this.createEmptyRouteLayer();
        let updatedStopLayer = this.cloneStopLayer(stopLayer);

        networkService.fetchServiceDescription(environment.ROUTE_URL,  environment.ARCGIS_API_KEY).then(serviceDescription => {
          const { defaultTravelMode, supportedTravelModes } = serviceDescription;

          console.log(defaultTravelMode, supportedTravelModes );

          const routeParams = new RouteParameters({
            apiKey: environment.ARCGIS_API_KEY,
            stops: new FeatureSet({
              features: stopLayer.graphics.toArray()
            }),
            preserveFirstStop: true,
            preserveLastStop: true,
            findBestSequence: true,
            returnStops: true,
            travelMode: defaultTravelMode,
            outSpatialReference:{
              wkid: 4326
            },
            returnDirections: true
          });

          Route.solve(environment.ROUTE_URL, routeParams).then(async (solveResult) => {
            console.log(solveResult);

            solveResult.routeResults.forEach(async (result) => {
              const lineSymbol = new CIMSymbol({
                data: {
                  type: "CIMSymbolReference",
                  symbol: {
                     type: "CIMLineSymbol",
                     symbolLayers: [
                       {
                          // black 1px line symbol
                          type: "CIMSolidStroke",
                          enable: true,
                          width: 3,
                          color: this.helper.getColorByNumber(0, 255)
                       },
                       {
                          // arrow symbol
                          type: "CIMVectorMarker",
                          enable: true,
                          size: 9,
                          markerPlacement: {
                             // places same size markers along the line
                             type: "CIMMarkerPlacementAlongLineSameSize", 
                             endings: "WithMarkers",
                             placementTemplate: [70] // determines space between each arrow
                          },
                          frame: {
                             xmin: -5,
                             ymin: -5,
                             xmax: 5,
                             ymax: 5
                          },
                          markerGraphics: [
                             {
                                type: "CIMMarkerGraphic",
                                geometry: {
                                   rings: [
                                     [
                                       [-8, -5.47],
                                       [-8, 5.6],
                                       [1.96, -0.03],
                                       [-8, -5.47]
                                     ]
                                   ]
                                },
                                symbol: {
                                   // black fill for the arrow symbol
                                   type: "CIMPolygonSymbol",
                                   symbolLayers: [
                                      {
                                         type: "CIMSolidFill",
                                         enable: true,
                                         color: this.helper.getColorByNumber(0, 255)
                                      }
                                   ]
                                }
                             }
                          ]
                       }
                     ]
                  }
               }});

              result.route.symbol = lineSymbol;
              result.route.attributes = {id: planId};

              routeLayer.graphics.add(result.route);

              for (const stop of result.stops) {
                const stopGraphic = updatedStopLayer.graphics.find(graphic => graphic.attributes.Name == stop.attributes.Name);
                stopGraphic.attributes.Sequence = stop.attributes.Sequence;
                stopGraphic.attributes.Cumul_TravelTime = stop.attributes.Cumul_TravelTime;
                stopGraphic.attributes.Cumul_Kilometers = stop.attributes.Cumul_Kilometers;

                const symbol = await this.createIconSymbol({primaryType: stopGraphic.attributes.PrimaryType, sequence: stopGraphic.attributes.Sequence});
                stopGraphic.symbol.set("url", symbol.url);
              }
    
              sub.next([routeLayer,updatedStopLayer]);
              sub.complete();

            });
          });
        })


      } else {
          sub.next([stopLayer,stopLayer]);
          sub.complete();
      }

    });
  }

  createPopTemplate(place: Place) {
    return new PopupTemplate({
      title: place.name,
      content: `
      <h4><b>${place.formattedAddress}</b></h4>
      <p>${place.reason}</p>
      `
    });
  }

  async createIconSymbol(place: any) {
   const icon = await this.helper.getIconWithNumber(place.primaryType, place.sequence);

   let symbol = {
    type: "picture-marker",
    url: icon.url,
    width: `${icon.width}px`,
    height: `${icon.height}px`,
    outline: {
      color: [0, 0, 0, 0.7],
      width: 0.5
    },
   };

   return symbol;
  }

}

export interface StopLayer {
  day: number,
  layer: GraphicsLayer
}

export interface VrpParam {
  depots: Graphic[],
  orders: Graphic[],
  routes: any[]
}