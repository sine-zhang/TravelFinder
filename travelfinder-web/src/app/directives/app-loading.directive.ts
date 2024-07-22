import { ViewContainerRef, Directive, inject, TemplateRef, Input } from '@angular/core';
import { AppLoaderComponent } from '../components/app-loader/app-loader.component';
import { BusyIndicatorComponent } from "@ui5/webcomponents-ngx/main/busy-indicator";

@Directive({
  selector: '[appIsLoading]',
  standalone: true,
})
export class LoadingDirective {
  constructor(private templateRef: TemplateRef<any>, private vcRef: ViewContainerRef){}

  @Input()
  set appIsLoading(loading: boolean) {
    this.vcRef.clear();

    if (loading) {
      this.vcRef.createComponent(AppLoaderComponent);
    } else {
      this.vcRef.createEmbeddedView(this.templateRef);
    }
  }
}
