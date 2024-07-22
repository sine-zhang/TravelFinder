import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Ui5WebcomponentsModule } from '@ui5/webcomponents-ngx';
import { LabelComponent } from '@ui5/webcomponents-ngx/main/label';
import { ButtonComponent } from '@ui5/webcomponents-ngx/main/button';
import { InputComponent } from '@ui5/webcomponents-ngx/main/input';
import { PopoverComponent } from '@ui5/webcomponents-ngx/main/popover';
import { IconComponent } from '@ui5/webcomponents-ngx/main/icon';
import { TextAreaComponent } from "@ui5/webcomponents-ngx/main/text-area";
import { BusyIndicatorComponent } from "@ui5/webcomponents-ngx/main/busy-indicator";
import { MessageStripComponent } from "@ui5/webcomponents-ngx/main/message-strip";

import "@ui5/webcomponents-icons/dist/AllIcons.js"

@NgModule({
  declarations: [
  ],
  exports:[
    Ui5WebcomponentsModule,
    LabelComponent,
    ButtonComponent,
    InputComponent,
    PopoverComponent,
    IconComponent,
    TextAreaComponent,
    BusyIndicatorComponent,
    MessageStripComponent
  ],
  imports: [
    Ui5WebcomponentsModule,
    LabelComponent,
    ButtonComponent,
    InputComponent,
    PopoverComponent,
    IconComponent,
    TextAreaComponent,
    BusyIndicatorComponent,
    MessageStripComponent
  ]
})
export class UI5Module { }
