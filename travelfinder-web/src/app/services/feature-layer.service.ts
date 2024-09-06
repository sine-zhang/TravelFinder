import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FeatureLayerService {

  constructor() { }

  async applyEdits(adds:any) {
    const result = JSON.stringify(adds)

    const response = await fetch(`${environment.API_URL}/Gis/ApplyEdits`, {
      method: "POST",
      cache: "no-cache",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({adds: result}),
    });

  }
}
