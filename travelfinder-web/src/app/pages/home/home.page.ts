import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterModule} from '@angular/router';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UI5Module } from "src/app/shared/ui5.module";
import { IonicsModule } from "src/app/shared/ionics.module";
import { MapComponent  } from "src/app/components/map/map.component";
import { MenuPage } from 'src/app/pages/menu/menu.page';
import { PlanPage } from '../plan/plan.page';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonicsModule,
    CommonModule,
    UI5Module,
    RouterModule,
    FormsModule,
    MapComponent, 
    MenuPage
  ],
})
export class HomePage {
  constructor() {}
}
