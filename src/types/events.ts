import { BarsBeatsSixteenths, Time as TimeUnit } from "tone/build/esm/core/type/Units"
import { PlayerState, SectionData } from "./player";

export declare type IndexEventType =
  "indexWillStart" | 
  "indexDidStart" |
  "indexWillEnd" |  
  "indexDidEnd" |
  "indexCancel" |
  "repeatDidLoop" |
  "repeatWillLoop"

export class JSONgEvent extends Event {
  /** Current section that will take action */
  current: SectionData;
  /** A section that will be impacted by current section */
  previous: SectionData;
  
  when: BarsBeatsSixteenths;
  now: BarsBeatsSixteenths;

  constructor(type: IndexEventType, 
      current:SectionData, 
      previous: SectionData, 
      when: BarsBeatsSixteenths, 
      now: BarsBeatsSixteenths, 
    ) {
    
    super(type);
    this.current = current;
    this.previous = previous;
    this.when = when;
    this.now = now;
  }
}

export declare type TransportEventType = "timing"
export class TransportEvent extends Event {
  when: BarsBeatsSixteenths;

  constructor(type: TransportEventType, when: BarsBeatsSixteenths){
    super(type)
    this.when = when;
  }
}

export declare type PlayerEventType = 
  "state" 
export class PlayerEvent extends Event{
  stateOld: PlayerState 
  stateNow: PlayerState

  constructor(type: PlayerEventType, previous: PlayerState, current: PlayerState){
    super(type)
    this.stateOld = previous;
    this.stateNow = current;
  }
}