import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MapComponent } from 'src/app/components/map/map.component';
import { UI5Module } from 'src/app/shared/ui5.module';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, filter, from, lastValueFrom, map, of, take } from 'rxjs';
import { RouteService } from 'src/app/services/route.service';
import Point from '@arcgis/core/geometry/Point';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import MapView from '@arcgis/core/views/MapView';
import { environment } from 'src/environments/environment';
import { ApiService, Creator, MessageBody, Place } from 'src/app/services/api.service';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import { LoadingDirective } from 'src/app/directives/app-loading.directive';
import { AppLoaderComponent } from 'src/app/components/app-loader/app-loader.component';
import { Helper } from 'src/app/shared/helper';
import Graphic from '@arcgis/core/Graphic';
import { LongPressDirective } from 'src/app/directives/long-press.directive';
import { ModalController } from '@ionic/angular';
import { PlanDetailComponent } from 'src/app/components/plan-detail/plan-detail.component';
import { PlaceDetail, PlaceDetailComponent } from 'src/app/components/place-detail/place-detail.component';
import { GeocodeService } from 'src/app/services/geocode.service';
import { FeatureLayerService } from 'src/app/services/feature-layer.service';

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
            LoadingDirective,
            LongPressDirective
          ]
})
export class PlanPage implements OnInit {

  constructor(private router:Router,
              private routeService: RouteService,
              private fb:FormBuilder,
              private api:ApiService,
              private featureLayer: FeatureLayerService,
              private helper: Helper,
              private modalCtrl: ModalController,
              private geocodeService: GeocodeService) {
    this.inputForm = this.fb.group({
      prompt: ['', Validators.required]
    });

    this.currentCoords = {lat:0,lng:0};
    this.messageBody = {
      system: "",
      messages: [],
      tokenUsed: 0,
      graphicsJSON:[],
      latitude: 0,
      longitude: 0
    };
  }

  async ngOnInit() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd))
                      .subscribe(event => {
                        this.updateTitle(this.planId)

                        this.messageBody = this.readMessags(this.planId);

                        if (this.messageBody.graphicsJSON.length > 0) {
                          const graphicLayers = this.fromGraphicJson(this.messageBody.graphicsJSON);

                          this.layers = of(graphicLayers);
                        } else {
                          this.layers = new Observable<GraphicsLayer[]>();
                        }
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
    });

    view.on("click", async (event:any) => {
      this.screenPoint = {
        x: event.x,
        y: event.y
      };

      view.hitTest(this.screenPoint).then((response:any) => {
        if (response.results.length) {
          const [layer] = response.results.filter((result:any) => {
            return ["route_layer"].includes(result.layer.id );
          });
          console.log(layer);

          if (layer) {
            this.router.navigateByUrl(`/detail/${layer.graphic.attributes.id}`);
          }
        }
      });
      
      console.log(this.screenPoint);
    });
  }

  async onMapPress(event:any) {
    await this.openModal(new Point({
      latitude: this.currentCoords.lat,
      longitude: this.currentCoords.lng
    }));
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
      const places = this.getPlaces(content);

      if (places) {
        this.messageBody.messages = this.messageBody.messages.concat([
        {
          content: prompt,
          role: Creator.Me
        },
        {
          content: content,
          role: Creator.Bot
        }]);

        this.layers = this.routeService.createRouteLayer(places, this.planId).pipe(take(1));

        this.layers.subscribe(layers => {
          this.currentLayers = layers;

          this.messageBody.graphicsJSON = this.toGraphicJson(this.currentLayers);

          this.saveMessages(this.planId, this.messageBody);
        });
      }
    }
  }

  getLocations(result: any) {
    const plan = JSON.parse(result);
    const locations = plan.Locations.map((place:any) => place.Location);

    return locations;
  }

  getPlaces(result: any) {
    const plan = JSON.parse(result);
    let places = plan.Locations.map((location:any):Place => {
      return {
        name: location.Name,
        formattedAddress: location.FormattedAddress,
        primaryType: location.PrimaryType,
        location: {
          latitude: location.Latitude,
          longitude: location.Longitude,
        },
        reason: location.SuggestReason
      }
    })

    return places;
  }

  getError(result: any) {
    const message = JSON.parse(result);

    if ((!message.Locations ||  message.Locations.length == 0) && message.Description) {
      return message.Description;
    }

    return "";
  }

  clearError() {
    this.errorMessage = "";
  }

  readMessags(planId:string) {
    const messageValue = localStorage.getItem(planId);
    let messageBody:MessageBody = {
      system: "",
      messages: [],
      tokenUsed: 0,
      graphicsJSON: [],
      latitude:null,
      longitude:null
    };

    if(messageValue) {
      messageBody = JSON.parse(messageValue);
    }

    return messageBody;
  }

  saveMessages(planId:string, messageBody:MessageBody) {
    messageBody.latitude = this.currentCoords.lat;
    messageBody.longitude = this.currentCoords.lng;

    const messageValue = JSON.stringify(messageBody);

    localStorage.setItem(planId, messageValue);
  }

  toGraphicJson(graphicLayers: GraphicsLayer[]) {
    let graphicsJson = graphicLayers.map(layer => {
      return {
        id: layer.id,
        graphics: layer.graphics.map(graphic => graphic.toJSON())
      };
    });

    return graphicsJson;
  }

  fromGraphicJson(graphicJsons: any[]) {
    let graphicsLayer:GraphicsLayer[] = [];

    graphicJsons.forEach((graphicJson: any) => {
      let graphicLayer = new GraphicsLayer({
        id: graphicJson.id
      });

      graphicJson.graphics.forEach((graphic:any) =>
        graphicLayer.add(Graphic.fromJSON(graphic))
      );

      graphicsLayer.push(graphicLayer);
    });

    return graphicsLayer;
  }

  updateTitle(planId:string) {
    const planItems = this.helper.unserializePlanItems();
    const [planItem] = planItems.filter(item => item.id == planId);
    this.title = planItem?.value;
  }

  async openModal(locationPoint:Point) {
    const modal = await this.modalCtrl.create({
      component: PlaceDetailComponent,
      componentProps: {
        locationPoint,
        cancel: () => {
          console.log('close');

          modal.dismiss();
        },
        save: async (result:PlaceDetail) => {
          console.log(result);

          await this.saveDetail(result);

          modal.dismiss();
        }
      }
    });

    modal.present();

    const { data, role } = await modal.onWillDismiss();
  }

  async saveDetail(placeDetail: PlaceDetail) {
    const requestMessage = {
      geometry:{
        spatialReference:{wkid:4326},
        x: placeDetail.location.longitude,
        y: placeDetail.location.latitude
      },
      attributes:{
        Name: placeDetail.name,
        Category: placeDetail.category,
        Description: placeDetail.description
      }
    };

    await this.featureLayer.applyEdits(requestMessage);
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

  currentLayers!: GraphicsLayer[];
  title:string = "Plan";
  screenPoint:any;
}
