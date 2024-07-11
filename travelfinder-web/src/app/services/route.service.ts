import { Injectable } from '@angular/core';
import Point from '@arcgis/core/geometry/Point';
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import * as Route from "@arcgis/core/rest/route";
import { environment } from 'src/environments/environment';
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RouteService {

  constructor() { }

  createStopLayer(points:Point[], attributes:any=null) {
    let layer = new GraphicsLayer();

    let symbol = {
      type: "simple-marker",  // autocasts as new SimpleMarkerSymbol()
      style: "circle",
      color: "#007AC2",
      size: "20px",  // pixels
      outline: {  // autocasts as new SimpleLineSymbol()
        color: "white",
        width: 1.5  // points
      }
    };

    let graphics = points.map(point => {
      const graphic = new Graphic({
        symbol: symbol,
        geometry: point,
        attributes: attributes
      });

      return graphic;
    });

    layer.graphics.addMany(graphics);

    return layer;
  }

  createRouteLayer(points:Point[], attributes:any=null): Observable<GraphicsLayer[]>{
    return new Observable<GraphicsLayer[]>((sub) => {
      let stopLayer = this.createStopLayer(points);
      let routeLayer = new GraphicsLayer();
  
      const routeParams = new RouteParameters({
        apiKey: environment.ARCGIS_API_KEY,
        outSpatialReference: {
          // autocasts as new SpatialReference()
          wkid: 3857
        },
        findBestSequence: true,
        stops: new FeatureSet({
          features: stopLayer.graphics.toArray()
        }),
  
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
    
          routeLayer.graphics.add(result.route);

          sub.next([routeLayer,stopLayer]);
          sub.complete();
        });
      });
    });
  }

}
