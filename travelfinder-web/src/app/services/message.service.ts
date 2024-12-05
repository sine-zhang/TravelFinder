import { Injectable } from '@angular/core';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import { ApiService, Creator, MessageBody, Place } from 'src/app/services/api.service';
import Graphic from '@arcgis/core/Graphic';

@Injectable({
  providedIn: 'root'
})
export class MessageService {

  constructor() { }

  readMessags(planId:string) {
    const messageValue = localStorage.getItem(planId);
    let messageBody:MessageBody = {
      system: "",
      messages: [],
      tokenUsed: 0,
      graphicsJSON: [],
      latitude:null,
      longitude:null,
      plan: null
    };

    if(messageValue) {
      messageBody = JSON.parse(messageValue);
    }

    return messageBody;
  }

  saveMessages(planId:string, messageBody:MessageBody) {
    const messageValue = JSON.stringify(messageBody);

    localStorage.setItem(planId, messageValue);
  }

  toGraphicJson(graphicLayers: GraphicsLayer[]) {
    let graphicsJson = graphicLayers.map(layer => {
      return {
        id: layer.id,
        graphics: layer.graphics.map(graphic => graphic.toJSON())
      };
    });

    return graphicsJson;
  }

  fromGraphicJson(messageBody:MessageBody) {
    let graphicsLayer:GraphicsLayer[] = [];

    messageBody.graphicsJSON.forEach((graphicJson: any) => {
      let graphicLayer = new GraphicsLayer({
        id: graphicJson.id
      });

      graphicJson.graphics.forEach((graphic:any) =>
        graphicLayer.add(Graphic.fromJSON(graphic))
      );

      graphicsLayer.push(graphicLayer);
    });

    return graphicsLayer;
  }
}
