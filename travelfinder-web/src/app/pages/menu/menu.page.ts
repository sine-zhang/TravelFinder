import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Observable, of } from 'rxjs';

import { PlanItem, PlanItemComponent } from 'src/app/components/plan-item/plan-item.component';
import { Helper } from 'src/app/shared/helper';
import { LoadingDirective } from 'src/app/directives/app-loading.directive';
import { AppLoaderComponent } from 'src/app/components/app-loader/app-loader.component';

@Component({
  selector: 'sp-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule, PlanItemComponent],
})
export class MenuPage implements OnInit {

  constructor(private helper:Helper, private router:Router) {
    this.planItems = this.helper.unserializePlanItems();
    this.hasKey = of(true);
  }

  ngOnInit() {
  }

  goToItem(item:any){
    this.router.navigate([`/plan/${item.id}`]);
  }
 
  onItemCreate(){
    this.planItems.push({
      id: this.helper.generateUUID(),
      value: "New Plan"
    });

    this.helper.serializePlanItems(this.planItems);
  } 

  onItemDelete(deleteItem:PlanItem){
    this.planItems = this.planItems.filter((item) => item.id !== deleteItem.id);

    this.helper.serializePlanItems(this.planItems);
    localStorage.removeItem(deleteItem.id);

    let lastPlanItem = this.planItems.at(-1);

    if(lastPlanItem) {
      this.goToItem(lastPlanItem);
    } else {
      this.router.navigate(['/']);
    }
  }

  onItemSave(saveItem:PlanItem) {
    this.planItems = this.planItems.map((item) => {
      if(item.id == saveItem.id) {
        return Object.assign({}, item, {value:saveItem.value});
      }

      return item;
    });

    this.helper.serializePlanItems(this.planItems);
  }

  planItems: PlanItem[];
  hasKey: Observable<boolean>;

}
