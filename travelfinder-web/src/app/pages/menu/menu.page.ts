import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Observable, of } from 'rxjs';

import { PlanItem, PlanItemComponent } from 'src/app/components/plan-item/plan-item.component';
import { Helper } from 'src/app/shared/helper';

@Component({
  selector: 'sp-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule, PlanItemComponent],
})
export class MenuPage implements OnInit {

  constructor(private helper:Helper, private router:Router) {
    this.planItems = this.unserializePlanItems();
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

    this.serializePlanItems();
  } 

  onItemDelete(deleteItem:PlanItem){
    this.planItems = this.planItems.filter((item) => item.id !== deleteItem.id);

    this.serializePlanItems();
  }

  onItemSave(saveItem:PlanItem) {
    this.planItems = this.planItems.map((item) => {
      if(item.id == saveItem.id) {
        return Object.assign({}, item, {value:saveItem.value});
      }

      return item;
    });

    this.serializePlanItems();
  }

  serializePlanItems(){
    localStorage.setItem("PLAN_ITEMS", JSON.stringify(this.planItems));
  }

  unserializePlanItems(){
    const planItemsContent = localStorage.getItem("PLAN_ITEMS");

    return planItemsContent ? JSON.parse(planItemsContent) : [];
  }

  planItems: PlanItem[];
  hasKey: Observable<boolean>;

}
