import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MapComponent } from 'src/app/components/map/map.component';
import { UI5Module } from 'src/app/shared/ui5.module';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, filter, from, lastValueFrom, map, of, take } from 'rxjs';
import { RouteService, StopLayer } from 'src/app/services/route.service';
import Point from '@arcgis/core/geometry/Point';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import MapView from '@arcgis/core/views/MapView';
import Extent from '@arcgis/core/geometry/Extent';
import { environment } from 'src/environments/environment';
import { ApiService, Creator, Message, MessageBody, Place } from 'src/app/services/api.service';
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
import { parse } from 'best-effort-json-parser'
import { MessageService } from 'src/app/services/message.service';

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
              private geocodeService: GeocodeService,
              private messageService: MessageService) {
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
      longitude: 0,
      plan: null
    };

    this.fullPlan = new Plan();
  }

  async ngOnInit() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd))
                      .subscribe(event => {
                        this.jsonResult = "";
                        this.updateTitle(this.planId)

                        this.messageBody = this.messageService.readMessags(this.planId);

                        if (this.messageBody.graphicsJSON.length > 0) {
                          const graphicLayers = this.messageService.fromGraphicJson(this.messageBody);

                          this.layers = of(graphicLayers);
                        } else {
                          this.layers = new Observable<GraphicsLayer[]>();
                        }


      });

      this.api.jsonMessage.subscribe(async message => {
        if (!message) return;

        this.jsonResult += message;

        let detlaPlan = parse(this.jsonResult);
        this.fullPlan.updatePlan(detlaPlan);

        if (this.fullPlan.getPlaces().length > 0) {
          this.stopLayer.graphics.removeAll();

          await this.routeService.upsertStopLayer(this.stopLayer, this.fullPlan.getPlaces());
          this.layers = of([this.stopLayer]);
        }

      });
  }

  get planId() {
    const reg = /plan\/(.+)/g;
    const values = reg.exec(this.router.url);

    return values != null ? values[1] : "";
  }

  async initGroupStopLayer(places: Place[]) {
    const groupPlaces = this.helper.groupBy(places, place => place.day);

    for(let [day, subPlaces] of groupPlaces) {
      let stopLayer = this.stopLayers.find(layer => layer.day == day);

      if (!stopLayer) {
        const newStopLayer = this.routeService.createEmptyStopLayer(day);
        this.stopLayers.push({day: day, layer: newStopLayer});

        stopLayer = { day: day, layer: newStopLayer };
      } else {
        stopLayer.layer.graphics.removeAll();
      }

      await this.routeService.upsertStopLayer(stopLayer.layer, subPlaces);
    }
  }

  async onMapReady(view: MapView) {
    const scale = view.scale || environment.MAX_SCALE;
    const radius = scale >= environment.MAX_SCALE ? environment.MAX_SCALE:scale;

    console.log(radius);

    this.currentCoords = this.getCurrentCoords(view);

    view.on("drag", (event:any) => {
      this.currentCoords = this.getCurrentCoords(view);
    });

    view.on("click", async (event:any) => {
      this.screenPoint = {
        x: event.x,
        y: event.y
      };

      this.currentCoords = this.getCurrentCoords(view);

      view.hitTest(this.screenPoint).then((response:any) => {
        if (response.results.length) {
          const [layer] = response.results.filter((result:any) => {
            return ["route_layer"].includes(result.layer.id );
          });
          console.log(layer);

          if (layer) {
            this.router.navigateByUrl(`/detail/${layer.graphic.attributes.id}`, { replaceUrl: true } );
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

  getCurrentCoords(view:MapView) {
    let mapCenter = view.extent.center;

    var newPoint = webMercatorUtils.webMercatorToGeographic(mapCenter);
    const centerJSON = newPoint.toJSON();

    return {
      lng: centerJSON.x,
      lat: centerJSON.y
    };
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
    try
    {
      this.stopLayer = this.routeService.createEmptyStopLayer();

      const content = await this.api.getStreamCommandByMessages(this.planId, requestMessages, lat, lng);
      const error = this.getError(content);

      if (error) {
        this.errorMessage = error;
        this.jsonResult = "";
      } else if (this.stopLayer.graphics.length > 1) {
        this.messageBody.messages = this.messageBody.messages.concat([
          {
            content: prompt,
            role: Creator.Me
          },
          {
            content: content,
            role: Creator.Bot
          }]);

        const layers = this.routeService.createRouteLayer(this.stopLayer, this.planId).pipe(take(1));
        layers.subscribe(layers => this.processLayers(layers));
      }
    }
    catch(ex){
      console.log(ex);
    }
    finally{
      this.isLoading = false;
      this.jsonResult = "";
    }

  }

  processLayers(layers: GraphicsLayer[]) {
    const stopLayer = layers.find((layer: any) => layer.id == "stop_layer");

    if (!stopLayer) {
      return;
    }

    this.fullPlan.updateTravelTime(stopLayer);

    console.log(this.fullPlan);

    this.messageBody.graphicsJSON = this.messageService.toGraphicJson(layers);
    this.messageBody.plan = this.fullPlan;

    this.messageBody.latitude = this.currentCoords.lat;
    this.messageBody.longitude = this.currentCoords.lng;

    this.messageService.saveMessages(this.planId, this.messageBody);
    this.layers = of(layers);
  }

  getLocations(result: any) {
    const plan = JSON.parse(result);
    const locations = plan.Locations.map((place:any) => place.Location);

    return locations;
  }

  getError(result: any) {
    if (result && !this.helper.isJson(result)) {
      return result;
    }

    const message = JSON.parse(result);

    if ((!message.Locations ||  message.Locations.length == 0) && message.Description) {
      return message.Description;
    }

    return "";
  }

  clearError() {
    this.errorMessage = "";
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
        Description: placeDetail.description,
        FormattedAddress: placeDetail.formattedAddress
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

  title:string = "Plan";
  screenPoint:any;

  jsonResult:string = "";

  stopLayer!:GraphicsLayer;
  stopLayers!: StopLayer[];

  fullPlan: Plan;
}

export interface PlanModel {
  name: string,
  description: string,
  places: Place[],
  groupPlaces: Map<number, Place[]>
}

export class Plan {
  constructor(rawPlan: any = null) {
    this.planModel = {
      name: "",
      description: "",
      places: [],
      groupPlaces: new Map<number, Place[]>()
    };

    if (rawPlan)
    {
      this.updatePlan(rawPlan);
    }
  }

  static getPlaces(obj: any): Place[] {
    let locations = [];

    if (Array.isArray(obj)) {
      locations = obj;
    } else {
      locations = obj.Locations;
    }

    let places = locations?.filter((place:any)=> this.isValidLocation(place))
                     .map((location:any):Place => {
          return {
            name: location.Name,
            formattedAddress: location.FormattedAddress,
            primaryType: location.PrimaryType,
            location: {
              latitude: location.Latitude,
              longitude: location.Longitude,
            },
            reason: location.SuggestReason,
            number: location.Number,
            day: location.Day,
            stopTime: location.Duration,
            priceLevel: location.PriceLevel,
            travelTime: 0,
            toggleStatus: false,
            suggestLocations: [],
            hint: "",
            distance: 0,
            sequence: 0,
            showDivider: false
          }
      });

      return places;
  }


  static isValidLocation(location:any) {
    return location.Name && location.FormattedAddress && location.PrimaryType
           && location.Latitude && location.Longitude && location.SuggestReason
           && location.Number;
  }

  static toLocationJSON(place: Place) {
    return {
      Name: place.name,
      FormattedAddress: place.formattedAddress,
      PrimaryType: place.primaryType,
      Latitude: place.location.latitude,
      Longitude: place.location.longitude,
      SuggestReason: place.reason,
      Number: place.number,
      Day: place.day,
      Duration: place.stopTime,
      PriceLevel: place.priceLevel
    };
  }

  static fromPlanObj(obj: any) {
    const newPlan = new Plan();

    newPlan.planModel = obj;

    return newPlan;
  }

  totalFormattedTime() {
    return this.formatMinutesToDHMS(this.totalTime());
  }

  totalTime() {
    return this.planModel.places.reduce((total, place) => total + place.stopTime + place.travelTime, 0);
  }

  totalDistance() {
    const value = this.planModel.places.reduce((total, place) => total + place.distance, 0);
    return Number(value).toFixed(2);
  }

  toLocationJSON() {
    return {
      Name: this.planModel.name,
      Description: this.planModel.description,
      Locations: this.planModel.places.map((place: any) => {
        return {
          Name: place.name,
          FormattedAddress: place.formattedAddress,
          PrimaryType: place.primaryType,
          Latitude: place.location.latitude,
          Longitude: place.location.longitude,
          SuggestReason: place.reason,
          Number: place.number,
          Day: place.day,
          Duration: place.stopTime,
          PriceLevel: place.priceLevel
        }
      })
    };
  }

  updatePlan(detlaPlan: any) {
    this.planModel.name = detlaPlan?.Name;
    this.planModel.description = detlaPlan?.Description;
    this.planModel.places = Plan.getPlaces(detlaPlan);
  }

  updatePlanByLocations(locations: []) {
    this.planModel.places = Plan.getPlaces(locations);
  }

  updateTravelTime(stopLayer: GraphicsLayer) {
    const stopInfoList = stopLayer.graphics.map((graphic: any) => graphic.attributes).sort((a: any, b: any) => a.Sequence - b.Sequence);

    stopInfoList?.forEach((stop: any, index: number) => {
      if (index > 0) {
        stop.TravelTime = stop.Cumul_TravelTime - stopInfoList.getItemAt(index - 1).Cumul_TravelTime;
        stop.TravelDistance = stop.Cumul_Kilometers - stopInfoList.getItemAt(index - 1).Cumul_Kilometers;
      } else {
        stop.TravelTime = 0;
        stop.TravelDistance = 0;
      }
    });

    const places = this.getPlaces();
    places.forEach((place, index) => {
      place.travelTime = stopInfoList?.find((stop: any) => stop.Number == place.number && stop.Day == place.day)?.TravelTime || 0;
      place.distance = stopInfoList?.find((stop: any) => stop.Number == place.number && stop.Day == place.day)?.TravelDistance || 0;
      place.sequence = stopInfoList?.find((stop: any) => stop.Number == place.number && stop.Day == place.day)?.Sequence || 0;
    });
  }

  getPlaces() {
    return this.planModel.places || [];
  }

  formatMinutesToDHMS(minutes: number): string {
    const days = Math.floor(minutes / 1440);
    const remainingMinutesAfterDays = minutes % 1440;
    const hours = Number(Math.floor(remainingMinutesAfterDays / 60)).toFixed(2);
    const mins = Number(remainingMinutesAfterDays % 60).toFixed(2);
    return `${days.toString().padStart(2, '0')} Days, ${hours.toString().padStart(2, '0')} Hours, ${mins.toString().padStart(2, '0')} Minutes`;
  }

  planModel!: PlanModel;
}
