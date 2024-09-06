import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, NgZone, Output } from '@angular/core';
import { GestureController } from "@ionic/angular";

@Directive({
  selector: '[longPress]',
  standalone: true
})
export class LongPressDirective implements AfterViewInit {

  @Output() press = new EventEmitter();
  @Input("delay") delay =  1000;
  action: any;

  private longPressActive = false;

  constructor(
                  private el: ElementRef, 
                  private gestureCtrl: GestureController, 
                  private zone: NgZone
              ) {}
  
  ngAfterViewInit() {
      this.loadLongPressOnElement();
  }    

  loadLongPressOnElement() {
      const gesture = this.gestureCtrl.create({
          el: this.el.nativeElement,
          threshold: 0,
          gestureName: 'long-press',
          onStart: ev => {
              this.longPressActive = true;
              this.longPressAction();
          },
          onEnd: ev => {
              this.longPressActive = false;
          }
      });
      gesture.enable(true);
  }
  
  private longPressAction() {
      if (this.action) {
          clearInterval(this.action);
      }
      this.action = setTimeout(() => {
          this.zone.run(() => {
              if (this.longPressActive === true) {
                  this.longPressActive = false;
                  this.press.emit(this.el);
              }
          });
      }, this.delay);
  }
}
