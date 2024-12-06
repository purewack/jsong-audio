import { PlayerState, PlayerSection, PlayerSectionGroup } from "./player";


export class ClickEvent extends Event {
  current: [number, number];
  constructor(value: [number, number]){
    super('click')
    this.current = value;
  }
}

export class TransportEvent extends Event {
  progress: [number, number];
  countdown?: number;
  constructor(value: [number, number], countdown?: number){
    super('transport')
    this.progress = value;
    this.countdown = countdown
  }
}

export class QueueEvent extends Event {  
  /** A section that will take action */
  to?: PlayerSection;
  /** A section that will be impacted by current section */
  from?: PlayerSection;

  breakout: boolean;

  constructor(
    to:PlayerSection | undefined, 
    from: PlayerSection | undefined,
    breakout: boolean
  ){
    super('queue')
    this.to = to
    this.from = from
    this.breakout = breakout;
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

  breakout: boolean;
  constructor(
    to:PlayerSection | undefined, 
    from: PlayerSection | undefined,  
    breakout: boolean
  ) {
    super('change');
    this.from = from;
    this.to = to;
    this.breakout = breakout;
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



export declare type ParseOptions = null 
  | "meta" | "done-meta" 
  | "timing" | "done-timing"
  | "sections" | "done-sections"
  | "tracks" | "done-tracks"
  |"audio" | "done-audio"
export interface ParseEventArgs {
  now: ParseOptions;
  prev: ParseOptions;
}
export interface StateEventArgs {
  now: PlayerState;
  prev: PlayerState;
}

export class StateEvent extends Event{
  stateOld: PlayerState ;
  stateNow: PlayerState;

  constructor(args: StateEventArgs )
  {
    super('state')
      this.stateOld = args.prev;
      this.stateNow = args.now;
    
  }
}
export class ParseEvent extends Event {
  phase: ParseOptions;
  phasePrev: ParseOptions;

  constructor(args: ParseEventArgs )
  {
    super('parse')
      this.phasePrev = args.prev;
      this.phase = args.now;
    
  }
}



export interface JSONgEventsList {
  'state': StateEvent;
  'parse': ParseEvent;

  'transport': TransportEvent;
  'click': ClickEvent;

  'queue': QueueEvent;
  'cancel': CancelQueueEvent;
  'change': ChangeEvent;
  'repeat': RepeatEvent;
  'loop': LoopEvent;
}