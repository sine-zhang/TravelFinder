import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Helper } from '../shared/helper';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import { makeStreamingJsonRequest } from "http-streaming-request";
import { parse } from 'best-effort-json-parser'
import { fromFetch } from 'rxjs/fetch';
import { switchMap, of, catchError } from 'rxjs';
import { Plan, PlanModel } from '../pages/plan/plan.page';

export interface Message {
  content: string;
  role: Creator
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  public nextMessage = new BehaviorSubject<DoneMessage|null>(null);
  public jsonMessage = new BehaviorSubject<string|null>(null);
  private messages = new BehaviorSubject<Message[]>([]);

  constructor(private helper:Helper) { }

  async getHintByMessages(planId: string, systemId:string, message: Message, lat: number, lng: number) {
    const fullMessage = {
      RequestId: planId,
      SystemId: systemId,
      Messages: [message],
      Latitude: lat,
      Longitude: lng
    };

    const response = await fetch(`${environment.API_URL}/chat/hint`, {
      method: "POST",
      cache: "no-cache",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify(fullMessage),
    });

    if(!response || !response.body)return;

    const reader = response.body.getReader();
    const {value, done} = await reader.read();

    const responseBody = new TextDecoder().decode(value) as any;

    const result = JSON.parse(responseBody);
    if (result.Choices?.length > 0) {
      return result.Choices[0].Message.content;
    }

    return null;
  }
  
  async getStreamCommandByMessages(planId:string, messages: Message[], lat: number, lng: number): Promise<string> {
    const fullMessage = {
      RequestId: planId,
      SystemId: "gis_helper",
      Messages: messages,
      Latitude: lat,
      Longitude: lng
    };

    let content = "";

    const response = await fetch(`${environment.API_URL}/chat/streamcommand`, {
      method: "POST",
      cache: "no-cache",
      keepalive: true,
      headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
      },
      body: JSON.stringify(fullMessage),
    });
    
    if(!response || !response.body)return "";

    const reader = response.body.getReader();
    let tiktokenCounter = 0;
  
    while (true) {
        const {value, done} = await reader.read();
        if (done){
          break;
        }
        
        var result = new TextDecoder().decode(value) as string;

        this.jsonMessage.next(result);
        content += result;
    }

    return content;
  }

  async getCommandByMessages(messages: Message[], lat: number, lng: number){
    const fullMessage = {
      SystemId: "gis_helper",
      Messages: messages,
      Latitude: lat,
      Longitude: lng
    };

    const response = await fetch(`${environment.API_URL}/chat/command`, {
      method: "POST",
      cache: "no-cache",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify(fullMessage),
    });

    if(!response || !response.body)return;

    const reader = response.body.getReader();
    const {value, done} = await reader.read();

    const responseBody = new TextDecoder().decode(value) as any;

    const result = JSON.parse(responseBody);

    return result;
  }

  async getCompletionByMessages(messages: Message[], systemId: string = '') {
    const fullMessage = {
      SystemId: systemId,
      messages: messages
    };

    const response = await fetch(`${environment.API_URL}/chat/post`, {
      method: "POST",
      cache: "no-cache",
      keepalive: true,
      headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
      },
      body: JSON.stringify(fullMessage),
    });
    
    if(!response || !response.body)return;

    const reader = response.body.getReader();
    let tiktokenCounter = 0;
  
    while (true) {
        const {value, done} = await reader.read();
        if (done){
          const doneMessage:DoneMessage = { tokenLength : tiktokenCounter, content:null}
          this.nextMessage.next(doneMessage);
          break;
        }
        
        var result = new TextDecoder().decode(value) as any;

        console.log(result);

        result = result.replaceAll("data:","").trim();

        result.split("\n").map((obj:any) => {
          if(!obj) return;

          obj = obj.trim();
          
          if(obj == '[DONE]')return;

          let msg = JSON.parse(obj);
        
          if(msg.choices[0].delta?.content) {
            const message:DoneMessage = {tokenLength:msg.choices[0].tokenLength, content: msg.choices[0].delta.content}
            this.nextMessage.next(message);
          } else if(msg.choices[0].finishReason == 'stop'){
            tiktokenCounter += msg.choices[0].tokenLength;
          }
        });

    }

    console.log(tiktokenCounter);
  }

  getMessage(){
    return this.messages.asObservable();
  }

  async nearPoint(latitude:number, longitude:number, langCode:string, radius:number) {
    const response = await fetch(`${environment.API_URL}/map/nearpoint?latitude=${latitude}&longitude=${longitude}&languageCode=${langCode}&radius=${radius}`, {
      method: "GET",
      cache: "no-cache"
    });

    if(!response || !response.body)return;

    const reader = response.body.getReader();
    const {value, done} = await reader.read();

    const responseBody = new TextDecoder().decode(value) as any;

    const result = JSON.parse(responseBody);

    return result;
  }
}

export enum Creator {
  Me = 'user',
  Bot = 'assistant',
}

export enum GPTModel {
  GPT3 = 'gpt-3.5-turbo',
  GPT4 = 'gpt-4'
}

export interface Message {
  content: string;
  role: Creator
}

export interface MessageBody{
  messages: Message[],
  system:string,
  tokenUsed:number,
  graphicsJSON: any[],
  latitude: any,
  longitude: any,
  plan: Plan | null,
}

export interface DoneMessage {
  content:string|null
  tokenLength: number
}

export interface Place {
  name: string,
  formattedAddress: string,
  primaryType:string,
  location: {
    latitude: any,
    longitude: any
  },
  reason: string,
  number: number,
  day: number,
  travelTime: number,
  stopTime: number,
  distance: number,
  sequence: number,

  toggleStatus: boolean,
  suggestLocations: any[],
  hint: string
}