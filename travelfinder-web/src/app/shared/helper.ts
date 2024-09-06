import {Injectable} from "@angular/core";
import { PlanItem } from "../components/plan-item/plan-item.component";

@Injectable({
    providedIn: 'root'
})
export class Helper {
  generateUUID = () => {
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

   isJson = (str:string) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
  };

  serializePlanItems = (planItems:PlanItem[]) => {
    localStorage.setItem("PLAN_ITEMS", JSON.stringify(planItems));
  }

  unserializePlanItems = ():PlanItem[] => {
    const planItemsContent = localStorage.getItem("PLAN_ITEMS");

    return planItemsContent ? JSON.parse(planItemsContent) : [];
  }

  getIcon = (category:string) => {
    var icons  = new Map<string, string>()
    let iconName:string | undefined = "place.svg";

    icons.set("hotel", "hotel.svg");
    icons.set("bar", "bar.svg");
    icons.set("store", "store.svg");
    icons.set("night_club", "night_club.svg");
    icons.set("library", "library.svg");
    icons.set("cafe", "cafe.svg");
    icons.set("landmark", "landmark.svg");
    icons.set("museum", "museum.svg");
    icons.set("gallery", "gallery.svg");
    icons.set("restaurant", "restaurant.svg");
    icons.set("park", "park.svg");

    icons.forEach((icon, name) => {
      if (category?.toLowerCase().indexOf(name.toLowerCase()) !== -1) {
        iconName = icon;
      }
    })

    for (var icon in icons) {

    }

    return `/assets/icon/${iconName}`;

  }
  
}