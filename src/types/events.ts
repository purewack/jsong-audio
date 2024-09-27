import { BarsBeatsSixteenths, Time as TimeUnit } from "tone/build/esm/core/type/Units"
import { PlayerState, PlayerSection } from "./player";





export declare type TransportEventType = "timing"
export class TransportEvent extends Event {
  when: BarsBeatsSixteenths;
  sectionBeat: number;
  sectionBar: number;
  sectionLen: number;

  constructor(type: TransportEventType, when: BarsBeatsSixteenths, beat: number, len:number, bar: number){
    super(type)
    this.when = when;
    this.sectionBar = bar
    this.sectionLen = len
    this.sectionBeat = beat
  }
}





export declare type SectionEventType =
  "sectionQueue" | 
  "sectionChange" |
  "repeatQueue" |
  "repeatLoop" |
  "repeatFinish" |
  "repeatBreak" |
  "cancel"

export class SectionEvent extends Event {
  /** A section that will take action */
  to: PlayerSection | null;
  /** A section that will be impacted by current section */
  from: PlayerSection | null;
  /** When will the change take place */
  when: BarsBeatsSixteenths;
  /** When was the change issued */
  now: BarsBeatsSixteenths;
  
  constructor(type: SectionEventType, 
      forWhen: BarsBeatsSixteenths, 
      when: BarsBeatsSixteenths, 
      to:PlayerSection | null, 
      from: PlayerSection | null, 
    ) {
    
    super(type);
    this.to = to;
    this.from = from;
    this.when = forWhen;
    this.now = when;
  }
}





export interface StateEventArgs {
  type: "state";
  now: PlayerState;
  prev: PlayerState;
}

export declare type ParseOptions = "meta" | "timing" | "sections" | "tracks" |"audio" | "done"
export interface ParseEventArgs {
  type: "parse";
  parsing: ParseOptions;
}

export class StateEvent extends Event{
  stateOld?: PlayerState ;
  stateNow?: PlayerState;
  parsing?: ParseOptions;

  constructor(args: StateEventArgs | ParseEventArgs)
  {
    super(args.type)
    if(args.type === "state"){
      this.stateOld = args.prev;
      this.stateNow = args.now;
    }
    else if(args.type === "parse"){
      this.parsing = args.parsing
    }
  }
}




export interface JSONgEventsList {
  'jsong': SectionEvent;
  'transport': TransportEvent ;
  'player': StateEvent ;
}