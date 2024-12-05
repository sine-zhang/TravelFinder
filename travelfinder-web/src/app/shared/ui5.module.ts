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
import { PanelComponent } from "@ui5/webcomponents-ngx/main/panel";
import { PageComponent } from "@ui5/webcomponents-ngx/fiori/page";
import { AvatarComponent } from "@ui5/webcomponents-ngx/main/avatar";
import { TagComponent } from "@ui5/webcomponents-ngx/main/tag";
import { ToolbarComponent } from "@ui5/webcomponents-ngx/main/toolbar";
import { ToolbarButtonComponent } from "@ui5/webcomponents-ngx/main/toolbar-button";
import { DynamicPageComponent } from "@ui5/webcomponents-ngx/fiori/dynamic-page";
import { DynamicPageTitleComponent } from "@ui5/webcomponents-ngx/fiori/dynamic-page-title";
import { DynamicPageHeaderComponent } from "@ui5/webcomponents-ngx/fiori/dynamic-page-header";
import { TextComponent } from "@ui5/webcomponents-ngx/main/text";
import { WizardComponent } from "@ui5/webcomponents-ngx/fiori/wizard";
import { WizardStepComponent } from "@ui5/webcomponents-ngx/fiori/wizard-step";
import { FormComponent } from "@ui5/webcomponents-ngx/main/form";
import { FormGroupComponent } from "@ui5/webcomponents-ngx/main/form-group";
import { FormItemComponent } from "@ui5/webcomponents-ngx/main/form-item";
import { IllustratedMessageComponent } from "@ui5/webcomponents-ngx/fiori/illustrated-message";
import { MultiComboBoxComponent } from "@ui5/webcomponents-ngx/main/multi-combo-box";
import { ToggleButtonComponent } from "@ui5/webcomponents-ngx/main/toggle-button";
import { TimelineComponent } from "@ui5/webcomponents-ngx/fiori/timeline";
import { TimelineItemComponent } from "@ui5/webcomponents-ngx/fiori/timeline-item";
import { TimelineGroupItemComponent } from "@ui5/webcomponents-ngx/fiori/timeline-group-item";

import "@ui5/webcomponents-icons/dist/AllIcons.js";
import "@ui5/webcomponents-fiori/dist/illustrations/NoData.js";

const UI5_COMPONENTS = [
  Ui5WebcomponentsModule,
  LabelComponent,
  ButtonComponent,
  InputComponent,
  PopoverComponent,
  IconComponent,
  TextAreaComponent,
  BusyIndicatorComponent,
  MessageStripComponent,
  PanelComponent,
  PageComponent,
  AvatarComponent,
  TagComponent,
  ToolbarComponent,
  ToolbarButtonComponent,
  DynamicPageComponent,
  DynamicPageTitleComponent,
  DynamicPageHeaderComponent,
  TextComponent,
  WizardComponent,
  WizardStepComponent,
  FormComponent,
  FormGroupComponent,
  FormItemComponent,
  IllustratedMessageComponent,
  MultiComboBoxComponent,
  ToggleButtonComponent,
  TimelineComponent,
  TimelineItemComponent,
  TimelineGroupItemComponent,
]

@NgModule({
  declarations: [
  ],
  exports: UI5_COMPONENTS,
  imports: UI5_COMPONENTS
})
export class UI5Module { }
