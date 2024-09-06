import { Injectable } from '@angular/core';
import Point from '@arcgis/core/geometry/Point';
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import * as Route from "@arcgis/core/rest/route";
import * as networkService from "@arcgis/core/rest/networkService";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
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

  createStopLayer(places: Place[], attributes:any=null) {
    let layer = new GraphicsLayer({
      id: "stop_layer",
    });

    let symbol:any = {
      type: "simple-marker",  // autocasts as new SimpleMarkerSymbol()
      style: "circle",
      color: "#007AC2",
      size: "20px",  // pixels
      outline: {  // autocasts as new SimpleLineSymbol()
        color: "white",
        width: 1.5  // points
      }
    };

    let graphics = places.map(place => {

      symbol = this.createIconSymbol(place);
      
      const graphic = new Graphic({
        symbol: symbol,
        geometry: new Point({
          latitude: place.location.latitude,
          longitude: place.location.longitude
        }),
        popupTemplate: this.createPopTemplate(place)
      });

      return graphic;
    });

    layer.graphics.addMany(graphics);

    return layer;
  }

  createRouteLayer(places: Place[], planId:string): Observable<GraphicsLayer[]>{
    return new Observable<GraphicsLayer[]>((sub) => {
      let stopLayer = this.createStopLayer(places);

      if (places.length > 1) {
        let routeLayer = new GraphicsLayer({
          id:"route_layer"
        });

        networkService.fetchServiceDescription(environment.ROUTE_URL,  environment.ARCGIS_API_KEY).then(serviceDescription => {
          const { defaultTravelMode, supportedTravelModes } = serviceDescription;

          console.log(defaultTravelMode, supportedTravelModes );

          const routeParams = new RouteParameters({
            apiKey: environment.ARCGIS_API_KEY,
            stops: new FeatureSet({
              features: stopLayer.graphics.toArray()
            }),
            findBestSequence: true,
            travelMode: defaultTravelMode,
            outSpatialReference:{
              wkid: 3857
            }
          });

          Route.solve(environment.ROUTE_URL, routeParams).then((solveResult) => {
            solveResult.routeResults.forEach((result) => {
              const simpleLineSymbol = new SimpleLineSymbol({
                cap: "round",
                color: "#990F0F",
                join: "round",
                miterLimit: 1,
                style: "solid",
                width: 4
              });
    
              result.route.symbol = simpleLineSymbol;
              result.route.attributes = {id: planId};
    
              routeLayer.graphics.add(result.route);
    
              sub.next([routeLayer,stopLayer]);
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

  createIconSymbol(place: Place) {
   const icon = this.helper.getIcon(place.primaryType);

   let symbol = {
    type: "picture-marker",
    url: icon,
    width: "32px",
    height: "32px",
    outline: {
      color: [0, 0, 0, 0.7],
      width: 0.5
    },
   };

   return symbol;
  }

}
