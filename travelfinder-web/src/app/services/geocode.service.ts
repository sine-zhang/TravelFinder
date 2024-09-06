import { Injectable } from '@angular/core';
import * as Locator from "@arcgis/core/rest/locator";
import esriConfig from '@arcgis/core/config';
import Point from '@arcgis/core/geometry/Point';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodeService {

  constructor() {
    esriConfig.apiKey = environment.ARCGIS_API_KEY;
    this.geocodeUrl = environment.GEOCODE_URL;
  }

  locationToAddress(point:Point):Observable<any> {
    return new Observable<any>((sub) => {
      Locator.locationToAddress(this.geocodeUrl, {
        location: point,
      }).then(result => {
        console.log(result.attributes);

        sub.next(result.attributes);
        sub.complete();
      });
    });


  }

  geocodeUrl:string;
}
