import { Component, OnInit } from '@angular/core';
import { UI5Module } from 'src/app/shared/ui5.module';

@Component({
  standalone: true,
  selector: 'app-loader',
  templateUrl: './app-loader.component.html',
  styleUrls: ['./app-loader.component.scss'],
  imports:[UI5Module]
})
export class AppLoaderComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
