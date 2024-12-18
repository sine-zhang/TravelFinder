import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, Input, OnChanges, SimpleChanges} from '@angular/core';
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
import { LoadingDirective } from 'src/app/directives/app-loading.directive';
import { AppLoaderComponent } from '../app-loader/app-loader.component';
import { MessageService } from 'src/app/services/message.service';
import { Plan } from 'src/app/pages/plan/plan.page';
import { Helper } from 'src/app/shared/helper';

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
    AppLoaderComponent,
    LoadingDirective,
  ]
})
export class PlanDetailComponent  implements OnInit, OnDestroy, AfterViewInit {

  constructor(private router: Router,
              private api: ApiService,
              private fb:FormBuilder,
              private routeService: RouteService,
              private messageService: MessageService,
              private helper: Helper) {
    this.currentCoords = {lat:0,lng:0};
    this.places = [];
    this.plan = of(this.fullPlan);
  }

  async ngOnInit() {
    if (this.planID) {
      this.initPlan(this.planID);
    }
    // this.plan = this.router.events.pipe(filter(event => event instanceof NavigationEnd), map(() => {
    //   const plan = this.getPlan(this.planId);

    //   if (plan.planModel) {
    //     console.log("123", plan);

    //     this.fullPlan = plan;
    //     this.places = plan.planModel.places;
    //     const groupPlaces = this.helper.groupBy(plan.planModel.places, (place:Place) => place.day);
    //     this.groupPlaces = of(groupPlaces);
    //     plan.planModel.groupPlaces = groupPlaces;
    //   }

    //   return plan;
    // }));
  }

  initPlan(planId:string) {
    const plan = this.getPlan(planId);

    if (plan.planModel) {
      console.log("123", plan);

      this.fullPlan = plan;
      this.places = plan.planModel.places;
      const groupPlaces = this.helper.groupBy(plan.planModel.places, (place:Place) => place.day);
      this.groupPlaces = of(groupPlaces);
      plan.planModel.groupPlaces = groupPlaces;
    }

    this.plan = of(plan);
  }

  ngAfterViewInit() {
    console.log(123);
  }

  ngOnDestroy() {
    console.log("destroyed", this.planPath);
    this.routeEvent?.unsubscribe();
  }


  get planId() {
    const reg = /detail\/(.+)/g;
    const values = reg.exec(this.router.url);

    return values != null ? values[1] : "";
  }

  getPlan(planId:string): Plan {
    this.messageBody = this.messageService.readMessags(planId);

    this.currentCoords.lat = this.messageBody.latitude;
    this.currentCoords.lng = this.messageBody.longitude;

    return Plan.fromPlanObj(this.messageBody.plan?.planModel);
  }

  get formatedMinutes() {
    return this.formatMinutesToDHMS(this.fullPlan.totalTime());
  }

  async submitHint() {
    this.isLoading = true;

    console.log(this.places);

    const hintLocations = this.places.map((place:any) => {
      const suggestedLocation = place.suggestLocations?.find((suggest:any) => suggest.MarkAsSuggest);

      if (place.hint) {
        const hint = place.hint;
        place.hint = null;

        return { Day: place.day, Number: place.number, Hint: hint, PriceLevel: place.priceLevel};
      }
      else if (suggestedLocation) {
        suggestedLocation.MarkAsSuggest = false;

        return {
                  Day: place.number,
                  Number: place.number,
                  Longitude: suggestedLocation.Location.longitude,
                  Latitude: suggestedLocation.Location.latitude,
                  PrimaryType: suggestedLocation.PrimaryType,
                  Name: suggestedLocation.DisplayName.Text,
                  FormattedAddress: suggestedLocation.FormattedAddress,
                  PriceLevel: suggestedLocation.PriceLevel,
                }
      }

      return Plan.toLocationJSON(place);
    });

    hintLocations.sort((a, b) => {
      if (a.Day === b.Day) {
        return a.Number - b.Number;
      }
      return a.Day - b.Day;
    })

    let systemId = "gis_helper_3";
    const requestMessage = {
      content: JSON.stringify(hintLocations),
      role: Creator.Me
    };

    const hintPrefered = hintLocations.some((location:any) => location.Hint);

    if (hintPrefered) {
      systemId = "gis_helper_2"
    }

    const resultContent = await this.api.getHintByMessages(this.planId, systemId, requestMessage, this.currentCoords.lat, this.currentCoords.lng);
    const hintResult = JSON.parse(resultContent);
    const result = hintResult?.Plans || hintResult;

    if (result) {

      this.fullPlan.updatePlanByLocations(result);

      console.log(this.fullPlan);

      this.groupPlaces = of(this.helper.groupBy(this.fullPlan.getPlaces(), (place:Place) => place.day));
      this.plan = of(this.fullPlan).pipe(take(1));

      const stopLayer = await this.routeService.createStopLayer(this.fullPlan.getPlaces());

      this.layers = this.routeService.createRouteLayer(stopLayer, this.planId).pipe(take(1));

      this.layers.subscribe(layers => {
        this.processLayers(layers);
        this.isLoading = false;
      });
    }
  }

  async toggleClick(place:Place) {
    place.toggleStatus=!place.toggleStatus;

    if (place.toggleStatus) {
      const result = await this.api.nearPoint(this.planId, place.location.latitude, place.location.longitude, "en-us", 500);

      if (result?.Places) {
        place.suggestLocations = result.Places;
      } else {
        place.suggestLocations = [];
      }
    }
  }

  async suggestClick(suggest:any, place:Place) {
    place.suggestLocations?.forEach((location:any) => location.MarkAsSuggest = false);

    const value = suggest.target.value;
    const suggestLocation = place.suggestLocations?.find((suggestLocation:any) => suggestLocation.DisplayName.Text == value);

    if (suggestLocation) {
      suggestLocation.MarkAsSuggest = true;
    } else {
      place.hint = value;
    }

    this.places = this.places.map((refPlace) => {
      if (refPlace.number == place.number) {
        return place;
      }

      return refPlace;
    });

    console.log(this.places);
  }

  displayLoadingMusk(location:any) {
    return location.toggleStatus && this.isLoading;
  }

  getPathPath() {
    return this.planPath;
  }

  formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  formatMinutesToDHMS(minutes: number): string {
    const days = Math.floor(minutes / 1440);
    const remainingMinutesAfterDays = minutes % 1440;
    const hours = Math.floor(remainingMinutesAfterDays / 60);
    const mins = remainingMinutesAfterDays % 60;
    return `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  getIcon(category:string) {
    return this.helper.getIcon(category);
  }

  goBack() {
    this.router.navigate(['/plan', this.planId], { replaceUrl: true } );
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
  }

  dragStart(event: DragEvent, place: any) {
    event.dataTransfer?.setData('text/plain', JSON.stringify(place));
  }
  
  dragOver(event: DragEvent, place: any) {
    event.preventDefault();
    place.showDivider = true;
  }
  
  drop(event: DragEvent, place: any) {
    event.preventDefault();
    place.showDivider = false;
    const data = event.dataTransfer?.getData('text/plain');
    if (data) {
      const draggedPlace = JSON.parse(data);

      if (draggedPlace.name != place.name) {
        this.movePlace(draggedPlace, place);
      }
    }
  }
  
  dragLeave(event: DragEvent, place:any) {
    place.showDivider = false;
  }

  movePlace(fromPlace: Place, nextToPlace: Place) {
    const newPlaces = this.places.filter((refPlace) => !(refPlace.number == fromPlace.number && refPlace.day == fromPlace.day));

    fromPlace.day = nextToPlace.day;
    fromPlace.number = nextToPlace.number + 1;
 
    newPlaces.push(fromPlace);

    newPlaces.forEach((place, index) => {
      if (place.number > nextToPlace.number && place.day == nextToPlace.day) {
        place.number = index + 1;
      }
    });

    newPlaces.sort((a, b) => {
      if (a.day === b.day) {
        return a.number - b.number;
      }
      return a.day - b.day;
    });

    this.places = newPlaces;
    this.groupPlaces = of(this.helper.groupBy(this.places, (place:Place) => place.day));
  }

  formatString(content:string) {
    return this.helper.sanitizeString(content);
  }

  /*
  async ngOnChanges(changes: SimpleChanges) {
    const planId = changes["planID"]?.currentValue as string;
    if (planId) {
      this.initPlan(planId);
    }
  }
*/

  isLoading:boolean = false;
  fullPlan!: Plan;
  plan: Observable<Plan>;
  routeEvent!: Subscription;
  currentCoords: {
    lat:number,
    lng:number
  };
  places: Place[];
  layers: Observable<GraphicsLayer[]> = new Observable<GraphicsLayer[]>();
  messageBody:MessageBody = {
    system: "",
    messages: [],
    tokenUsed: 0,
    graphicsJSON: [],
    latitude:null,
    longitude:null,
    plan:null
  };

  planPath!:string;
  groupPlaces!: Observable<Map<number, Place[]>>;

  @Input()
  planID: string = "";
}
