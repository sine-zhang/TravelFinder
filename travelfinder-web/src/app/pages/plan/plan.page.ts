import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MapComponent } from 'src/app/components/map/map.component';
import { UI5Module } from 'src/app/shared/ui5.module';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, filter, from, lastValueFrom, map, of } from 'rxjs';
import { RouteService } from 'src/app/services/route.service';
import Point from '@arcgis/core/geometry/Point';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import MapView from '@arcgis/core/views/MapView';
import { environment } from 'src/environments/environment';
import { ApiService, Creator, MessageBody } from 'src/app/services/api.service';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import { LoadingDirective } from 'src/app/directives/app-loading.directive';
import { AppLoaderComponent } from 'src/app/components/app-loader/app-loader.component';
import { Helper } from 'src/app/shared/helper';

@Component({
  selector: 'sp-plan',
  templateUrl: './plan.page.html',
  styleUrls: ['./plan.page.scss'],
  standalone: true,
  imports: [
            IonicModule,
            CommonModule,
            FormsModule,
            ReactiveFormsModule,
            UI5Module,
            MapComponent,
            AppLoaderComponent,
            LoadingDirective
          ]
})
export class PlanPage implements OnInit {

  constructor(private router:Router, private routeService: RouteService, private fb:FormBuilder, private api:ApiService, private helper: Helper) {
    this.inputForm = this.fb.group({
      prompt: ['', Validators.required]
    });

    this.currentCoords = {lat:0,lng:0};
    this.messageBody = {
      system: "",
      messages: [],
      tokenUsed: 0
    };
  }

  async ngOnInit() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd))
                      .subscribe(event => {
                        console.log(this.planId);
                      });
  }

  get planId() {
    const reg = /plan\/(.+)/g;
    const values = reg.exec(this.router.url);

    return values != null ? values[1] : "";
  }

  async onMapReady(view: MapView) {
    const scale = view.scale || environment.MAX_SCALE;
    const radius = scale >= environment.MAX_SCALE ? environment.MAX_SCALE:scale;

    console.log(radius);

    view.on("drag", (event:any) => {
      let mapCenter = view.extent.center;

      var newPoint = webMercatorUtils.webMercatorToGeographic(mapCenter);
      const centerJSON = newPoint.toJSON();

      this.currentCoords = {
        lng: centerJSON.x,
        lat: centerJSON.y
      };

      // Search for graphics at the clicked location
      // view.hitTest(this.currentCoords).then((response:any) => {
      //   if (response.results.length) {
      //     var graphic = response.results.filter((result:any) => {
      //       // check if the graphic belongs to the layer of interest
      //       return result.layer.id === "stop_layer";
      //     })[0].graphic;
      //     // do something with the result graphic
      //     console.log(graphic);
      //   }
      // });
    });
  }

  async submit() {
    this.isLoading = true;
    this.errorMessage = "";

    let prompt = this.inputForm.getRawValue().prompt;

    const requestMessages = [...this.messageBody.messages, {
      content: prompt,
      role: Creator.Me
    }]

    const lat = this.currentCoords.lat;
    const lng = this.currentCoords.lng;
    const message = await this.api.getCommandByMessages(requestMessages, lat, lng);
    const content = message.Choices[0]?.Message.content;
    
    this.isLoading = false;

    const error = this.getError(content);

    if (error) {
      this.errorMessage = error;
    } else {
      const locations = this.getLocations(content);
  
      if (locations) {
        this.messageBody.messages = this.messageBody.messages.concat([
        {
          content: prompt,
          role: Creator.Me
        },
        {
          content: content,
          role: Creator.Bot
        }]);
    
        this.saveMessages(this.planId, this.messageBody);
    
        this.layers = this.routeService.createRouteLayer(locations.map((location:any) => {
            return new Point({
              latitude: location.Latitude || location.latitude,
              longitude: location.Longitude || location.longitude
            })
        })).pipe();
      }
    }
  }

  getLocations(result: any) {
    const plan = JSON.parse(result);
    const locations = plan.Locations.map((place:any) => place.Location);

    return locations;
  }

  getError(result: any) {
    if (!this.helper.isJson(result)) {
      return result;
    }

    const errorResult = JSON.parse(result);

    return errorResult.Error || errorResult.Message;
  }

  clearError() {
    this.errorMessage = "";
  }

  readMessags(planId:string) {
    const messageValue = localStorage.getItem(planId);
    let messageBody:MessageBody = {
      system: "",
      messages: [],
      tokenUsed: 0
    };

    if(messageValue) {
      messageBody = JSON.parse(messageValue);
    }

    return messageBody;
  }

  saveMessages(planId:string, messageBody:MessageBody) {
    const messageValue = JSON.stringify(messageBody);

    localStorage.setItem(planId, messageValue);
  }

  layers: Observable<GraphicsLayer[]> = new Observable<GraphicsLayer[]>();
  inputForm: FormGroup<any>;
  currentCoords:{
    lat:number,
    lng:number
  };
  messageBody:MessageBody;
  isLoading:boolean = false;
  errorMessage: string = "";
}
