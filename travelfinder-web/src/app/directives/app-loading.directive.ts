import { ViewContainerRef, Directive, inject, TemplateRef, Input } from '@angular/core';
import { AppLoaderComponent } from '../components/app-loader/app-loader.component';

@Directive({
  selector: '[appLoading]',
  standalone: true
})
export class LoadingDirective {
  private readonly templateRef = inject(TemplateRef<any>);
  private readonly vcRef = inject(ViewContainerRef);

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
