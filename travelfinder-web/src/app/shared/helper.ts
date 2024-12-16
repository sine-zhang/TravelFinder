import {Injectable} from "@angular/core";
import { PlanItem } from "../components/plan-item/plan-item.component";
import * as symbolService from "@arcgis/core/rest/symbolService.js";

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

    icons.set("hotel", "hotel_pinlet.svg");
    icons.set("bar", "bar_pinlet.svg");
    icons.set("store", "shopping_pinlet.svg");
    icons.set("shopping_mall", "shopping_pinlet.svg");
    icons.set("night_club", "bar_pinlet.svg");
    icons.set("library", "library_pinlet.svg");
    icons.set("cafe", "cafe_pinlet.svg");
    icons.set("landmark", "civic-bldg_pinlet.svg");
    icons.set("museum", "museum_pinlet.svg");
    icons.set("gallery", "gallery.svg");
    icons.set("restaurant", "restaurant_pinlet.svg");
    icons.set("bakery", "restaurant_pinlet.svg");
    icons.set("park", "tree_pinlet.svg");
    icons.set("school", "school_pinlet.svg");
    icons.set("university", "school_pinlet.svg");

    icons.forEach((icon, name) => {
      if (category?.toLowerCase().indexOf(name.toLowerCase()) !== -1) {
        iconName = icon;
      }
    })

    return `http://${this.getHostNameWithPort()}/assets/icon/${iconName}`;

  }

  getIconXmlContent = async (category: string, width: number = 28, height: number = 28): Promise<string> => {
    if (this.iconCache.has(category)) {
      return this.iconCache.get(category) as string;
    }

    const iconUrl = this.getIcon(category);

    try {
      const response = await fetch(iconUrl);
      const svgText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(svgText, "image/svg+xml");

      // Adjust width and height
      xmlDoc.documentElement.setAttribute("width", width.toString());
      xmlDoc.documentElement.setAttribute("height", height.toString());

      const svgContent = xmlDoc.documentElement.outerHTML;
      this.iconCache.set(category, svgContent);

      return svgContent;
    } catch (error) {
      console.error("Error fetching or parsing SVG:", error);
      return "";
    }
  };

  getHostNameWithPort = (): string => {
    const hostName = window.location.hostname;
    const port = window.location.port;
    return port ? `${hostName}:${port}` : hostName;
  }
  getIconWithNumber = async (category:string, sequence:number) => {
      var iconSvg = await this.getIconXmlContent(category);
      var sequenceLabel = sequence > 0 ? `
        <text text-anchor="middle" font-size="20" font-family="Consolas" x="70%" y="70%" dy=".3em" stroke-width="0" fill="#81C4FF" filter="url(#shadow)">${sequence}</text>` : "";
      var svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="black" flood-opacity="0.5"/>
                </filter>
            </defs>
            <g>
                <circle cx="17" cy="17" r="17" stroke="black" stroke-width="0.7" fill="none"/>
                ${iconSvg}
                ${sequenceLabel}
            </g>
        </svg>`;
      var svg = 'data:image/svg+xml;charset=UTF-8;base64,' + btoa(svgString);
      return { url: svg, height: 42, width: 42 };
  };

  getColorByNumber = (num: number = 0, op: number = 0.75) => {  
    const colors = [  
        [34, 98, 210, op],  
        [120, 45, 78, op],  
        [230, 110, 50, op],  
        [15, 180, 255, op],  
        [90, 140, 190, op],  
        [255, 99, 71, op],  
        [218, 165, 32, op],  
        [75, 0, 130, op],  
        [255, 20, 147, op],  
        [0, 128, 0, op]  
    ];  
  
    const index = Math.abs(num % colors.length);  
    return colors[index];  
  }

  groupBy = (list: any[], keyGetter: (n: any) => any): Map<any, any>  => {
    const map = new Map();
    list.forEach((item) => {
         const key = keyGetter(item);
         const collection = map.get(key);
         if (!collection) {
             map.set(key, [item]);
         } else {
             collection.push(item);
         }
    });
    return map;
  }

  sanitizeString = (input: string): string => {
    if (!input) {
      return input;
    }
    let sanitized = input.replace(/[_+;/]/g, ' ');
  
    sanitized = sanitized.trim();
  
    let words = sanitized.split(/\s+/);
  
    words = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
    sanitized = words.join(' ');

    return sanitized;
  }

  private iconCache = new Map<string, string>();
}