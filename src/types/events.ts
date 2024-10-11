import { BarsBeatsSixteenths, Time as TimeUnit } from "tone/build/esm/core/type/Units"
import { PlayerState, PlayerSection, PlayerIndex, PlayerSectionGroup } from "./player";


export class ClickEvent extends Event {
  value: [number, number];
  constructor(value: [number, number]){
    super('click')
    this.value = value;
  }
}

export class TransportEvent extends Event {
  progress: [number, number];
  bar: number;
  countdown?: number;
  constructor(value: [number, number], bar: number, countdown?: number){
    super('transport')
    this.progress = value;
    this.bar = bar
    this.countdown = countdown
  }
}

export class QueueEvent extends Event {  
  /** A section that will take action */
  to?: PlayerSection;
  /** A section that will be impacted by current section */
  from?: PlayerSection;
  constructor(
    to:PlayerSection | undefined, 
    from: PlayerSection | undefined
  ){
    super('queue')
    this.to = to
    this.from = from
  }
}

export class CancelQueueEvent extends Event {
  /** A section that will take action */
  to?: PlayerSection;
  /** A section that will be impacted by current section */
  from?: PlayerSection;
  constructor(
    to:PlayerSection | undefined, 
    from: PlayerSection | undefined
  ){
    super('cancel')
    this.to = to
    this.from = from
  }
}


export class ChangeEvent extends Event {
      /** A section that will take action */
  to?: PlayerSection;
  /** A section that will be impacted by current section */
  from?: PlayerSection;

  constructor(
    to:PlayerSection | undefined, 
    from: PlayerSection | undefined,  
  ) {
    super('change');
    this.from = from;
    this.to = to;
  }
}

export class RepeatEvent extends Event {
  group: PlayerSectionGroup;
  counter: [number,number];

  constructor(counter: [number,number], group: PlayerSectionGroup){
    super('repeat')
    this.group = group
    this.counter = counter
  }
}

export class LoopEvent extends Event {
  group: PlayerSectionGroup;
  constructor(group: PlayerSectionGroup){
    super('loop')
    this.group = group
  }
}



export declare type ParseOptions = "meta" | "timing" | "sections" | "tracks" |"audio" | "done"
export interface ParseEventArgs {
  type: "parse";
  phase: ParseOptions;
}
export interface StateEventArgs {
  type: "state";
  now: PlayerState;
  prev: PlayerState;
}

export class StateEvent extends Event{
  stateOld?: PlayerState ;
  stateNow?: PlayerState;
  phase?: ParseOptions;

  constructor(args: StateEventArgs | ParseEventArgs)
  {
    super(args.type)
    if(args.type === "state"){
      this.stateOld = args.prev;
      this.stateNow = args.now;
    }
    else if(args.type === "parse"){
      this.phase = args.phase
    }
  }
}




export interface JSONgEventsList {
  'player': StateEvent;

  'transport': TransportEvent;
  'click': ClickEvent;

  'queue': QueueEvent;
  'cancel': CancelQueueEvent;
  'change': ChangeEvent;
  'repeat': RepeatEvent;
  'loop': LoopEvent;
}