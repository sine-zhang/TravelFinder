import { Component, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UI5Module } from "../../shared/ui5.module";
import { IonicsModule } from "../../shared/ionics.module"

export interface PlanItem {
  id:string,
  value:string
}

@Component({
  selector: 'plan-item',
  templateUrl: './plan-item.component.html',
  styleUrls: ['./plan-item.component.scss'],
  standalone: true,
  imports:[
    CommonModule,
    UI5Module,
    RouterModule,
    FormsModule,
    IonicsModule
  ]
})
export class PlanItemComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

  onEdit(){
    this.isEdit = !this.isEdit;
  }

  onDelete(){
    this.delete.emit(this.planItem);
  }

  onSave(){
    this.isEdit = !this.isEdit;

    this.save.emit(this.planItem);
  }

  isEdit: boolean = false;

  @Input()
  planItem: PlanItem = {id:"", value:"New Plan"};

  @Output()
  save: EventEmitter<PlanItem> = new EventEmitter<PlanItem>();

  @Output()
  delete: EventEmitter<PlanItem> = new EventEmitter<PlanItem>();

}
