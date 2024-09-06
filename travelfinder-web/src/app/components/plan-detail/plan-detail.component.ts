import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit} from '@angular/core';
import { IonicsModule } from 'src/app/shared/ionics.module';
import { UI5Module } from 'src/app/shared/ui5.module';
import { IonicModule } from '@ionic/angular';
import { NavigationEnd, Router } from '@angular/router';
import { ApiService, Creator, MessageBody, Place} from 'src/app/services/api.service';
import { Observable, filter, from, lastValueFrom, map, of, take, Subscription, firstValueFrom, first} from 'rxjs';
import { FormsModule,ReactiveFormsModule, FormGroup,FormBuilder } from '@angular/forms';
import { RouterModule } from '@angular/router';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import { RouteService } from 'src/app/services/route.service';

@Component({
  selector: 'plan-detail',
  templateUrl: './plan-detail.component.html',
  styleUrls: ['./plan-detail.component.scss'],
  standalone: true,
  imports:[
    CommonModule,
    UI5Module,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    IonicsModule,
  ]
})
export class PlanDetailComponent  implements OnInit, OnDestroy,  AfterViewInit {

  constructor(private router: Router, private api: ApiService, private fb:FormBuilder, private routeService: RouteService) { 
    this.currentCoords = {lat:0,lng:0};
    this.plan = of(null);
    // this.inputForm = this.fb.group({
    //   locations: [[]]
    // });
    this.locations = [];
  }

  async ngOnInit() {
    this.plan = this.router.events.pipe(filter(event => event instanceof NavigationEnd),first(), map(() => {
      return this.getPlan(this.planId);
    }));

    
    const plan = await firstValueFrom(this.plan);

    console.log("123", plan);
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    console.log("destroyed");
    this.routeEvent?.unsubscribe();
  }


  get planId() {
    const reg = /detail\/(.+)/g;
    const values = reg.exec(this.router.url);

    return values != null ? values[1] : "";
  }

  get planPath() {
    return `/plan/${this.planId}`;
  }

  getPlan(planId:string) {
    const messageValue = localStorage.getItem(planId);

    if(messageValue) {
      this.messageBody = JSON.parse(messageValue);

      this.currentCoords.lat = this.messageBody.latitude;
      this.currentCoords.lng = this.messageBody.longitude;
    }

    const plans = this.messageBody.messages.filter(message => message.role == Creator.Bot);
    const planMessage = plans.pop();
    let plan = null;

    if (planMessage) {
      plan = JSON.parse(planMessage.content);
      this.locations = plan.Locations;
    }

    return plan;
  }

  saveMessages(planId:string, messageBody:MessageBody) {
    const messageValue = JSON.stringify(messageBody);

    localStorage.setItem(planId, messageValue);
  }

  modelChanged(location:any, index:number) {
    this.locations[index] = location;
  }

  async submitHint() {

    this.isLoading = true;

    const hintLocations = this.locations.map((location:any) => {
      if (location.Hint) {
        return { Number: location.Number, Hint: location.Hint };
      }

      return location;
    });

    const requestMessage = {
      content: JSON.stringify(hintLocations),
      role: Creator.Me
    };

    const resultContent = await this.api.getHintByMessages(requestMessage, this.currentCoords.lat, this.currentCoords.lng);
    const result = JSON.parse(resultContent);

    const plans = this.messageBody.messages.filter(message => message.role == Creator.Bot);
    let planMessage = plans.pop();

    if (planMessage) {
      const plan = JSON.parse(planMessage.content);

      result.forEach((location:any) => {
        if (location.Latitude && location.Longitude) {
          plan.Locations.forEach((original:any) => {
            if (original.Number == location.Number) {
              original.SuggestReason = location.SuggestReason;
              original.Longitude = location.Longitude;
              original.Latitude = location.Latitude;
              original.PrimaryType = location.PrimaryType;
              original.Name = location.Name;
              original.FormattedAddress = location.FormattedAddress;
            }
          })
        }
      });

      planMessage.content = JSON.stringify(plan);

      this.plan = of(plan);

      const places = this.getPlaces(result);

      this.layers = this.routeService.createRouteLayer(places, this.planId).pipe(take(1));
  
      this.layers.subscribe(layers => {
        this.messageBody.graphicsJSON = this.toGraphicJson(layers);
  
        this.saveMessages(this.planId, this.messageBody);
      });
    }
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

  getPlaces(locations: []) {
    let places = locations.map((location:any):Place => {
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
    });

    return places;
  }

  isLoading:boolean = false;
  plan: Observable<any>;
  routeEvent!: Subscription;
  currentCoords: {
    lat:number,
    lng:number
  };
  locations: any[];
  layers: Observable<GraphicsLayer[]> = new Observable<GraphicsLayer[]>();
  messageBody:MessageBody = {
    system: "",
    messages: [],
    tokenUsed: 0,
    graphicsJSON: [],
    latitude:null,
    longitude:null
  };
}
