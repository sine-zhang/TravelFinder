import { Component, ElementRef, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import Point from '@arcgis/core/geometry/Point';
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import * as route from "@arcgis/core/rest/route";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import Graphic from "@arcgis/core/Graphic";
import Symbol from "@arcgis/core/symbols/Symbol";
import Color from "@arcgis/core/Color";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import IconSymbol3DLayer from "@arcgis/core/symbols/IconSymbol3DLayer.js";
import PointSymbol3D from "@arcgis/core/symbols/PointSymbol3D.js";
import LineCallout3D from "@arcgis/core/symbols/callouts/LineCallout3D.js";
import Symbol3DVerticalOffset from "@arcgis/core/symbols/support/Symbol3DVerticalOffset.js";

import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
import { Geolocation } from '@capacitor/geolocation';
import { EventEmitter } from '@angular/core';

const MAX_SCALE = 50000;

@Component({
  selector: 'map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: true
})
export class MapComponent implements OnInit, OnChanges {

  constructor() {
  }

  async initializeMap() {
    const container = this.mapViewEl.nativeElement;

    this.view = new MapView({
      container,
      map: this.webmap,
      zoom: 4, // Sets zoom level based on level of detail (LOD)
      center: [15, 65], // Sets center point of view using longitude,latitude,
      spatialReference: { wkid: 3857 },
    });

    return this.view.when();
  }

  async ngOnInit() {
    const mapView = await this.initializeMap();
    console.log('The map is ready.');

    mapView.when(async () => {
      this.onReady.emit(this.view);
    });
  }

  arcgisViewReadyChange(event: any) {
    console.log("MapView ready", event);
  }

  getCenterPoint() {
    let mapCenter = this.view?.extent.center;
    return mapCenter;
  }

  showCenterPoint() {
    var point = this.getCenterPoint();

    if (point) {
      var newPoint = webMercatorUtils.webMercatorToGeographic(point);
      console.log(newPoint.toJSON());
    }

  }

  async ngOnChanges(changes: SimpleChanges) {
    const layers = changes["layers"]?.currentValue as Array<GraphicsLayer>;
    this.webmap.layers.removeAll();

    if (layers) {
      layers.forEach(layer => this.webmap.add(layer));
      this.view.goTo(layers[1].graphics.toArray(), {duration: 0, easing: "linear"});
    } else {
      const position = await Geolocation.getCurrentPosition();

      let pt = new Point({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

      this.view?.goTo({
        target:pt,
        zoom: 10
      });
    }
  }

  @ViewChild('mapViewNode', { static: true })
  private mapViewEl!: ElementRef;

  view!: MapView;

  webmap = new WebMap({
    basemap: "topo-vector", //Reference to the base of the map
  });

  @Input()
  layers!: GraphicsLayer[] | null;

  @Output()
  onReady: EventEmitter<MapView> = new EventEmitter<MapView>();
}
