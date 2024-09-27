import { JSONgManifestFile, JSONgMetadata, JSONgPlaybackInfo, JSONgTrack, FlowOverrideFlags } from './types/jsong'
import { PlayerSections, PlayerState, PlayerIndex, PlayerSectionOverrides, PlayerSection, VerboseLevel, PlayerFlowValue } from './types/player'
import quanTime from './quantime'
import {getNextSectionIndex,  findStart } from './nextSection'
import buildSection from './buildSection'
import {getNestedIndex} from './nestedIndex'
import Logger from './logger'
import fetchSources, { fetchSourcePaths } from './JSONg.sources'
import fetchManifest, { isManifestValid } from './JSONg.manifest'
import { AnyAudioContext } from 'tone/build/esm/core/context/AudioContext'
import { SectionEvent, JSONgEventsList, ParseOptions, StateEvent, TransportEvent } from './types/events'
import { applyFlowOverrides, parseFlowOverrides } from './overrides'

import { BarsBeatsSixteenths, Time as TimeUnit } from "tone/build/esm/core/type/Units"
import {
  setContext,
  getContext,
  now as toneNow,
  start as toneStart,
  Player, 
  ToneAudioBuffer, 
  Filter,
  Draw, 
  Synth, Transport, FilterRollOff, Destination, Time, ToneAudioBuffers,
} from 'tone';
import { NestedIndex } from './types/common'


export default class JSONg extends EventTarget{
  
  public VERSION_SUPPORT = ["J/1"]

  //Debug related - logging extra messages
  private _log = new Logger('warning');

  private _meta!: JSONgMetadata;
  set meta(value: JSONgMetadata){
    this._meta = {...value};
  }
  get meta(): JSONgMetadata {
    return {...this._meta};
  }

  public manifest!: JSONgManifestFile;

  
  //List of track involved with the song
  private _tracksList!: JSONgTrack[];
  get tracksList(){return this._tracksList}

  //Audio players and sources
  private _trackPlayers!:  {
    name: string;
    source: string;
    filter: Filter;
    volumeLimit: number;
    current: Player;
    a: Player;
    b: Player;
  }[]

  //Available real audio buffers
  private _sourceBuffers!: {[key: string]: ToneAudioBuffer};


  //Song playback details like BPM
  private _timingInfo!: {
      bpm: number;
      meter: [number, number];
      grain: number;
      metronome: {db: number, high: string, low: string};
      metronomeSchedule: number | null;
    } & JSONgPlaybackInfo
  get timingInfo(){
    return {...this._timingInfo, metronomeSchedule: undefined}
  }


  


  /**
   * Visual flow of named sections including loop counts
   * Private so stripped of any directives  
   */
  private _flow!: PlayerFlowValue;
  get flow(){
    return this._flow
  }

  /**
   * Looping details of each section, including specific directives
   */
  private _sections!: PlayerSections;
  get sections(){
    return this._sections;
  }
  public getSection(index: PlayerIndex): PlayerSection {
    return getNestedIndex(this._sections, index)
  }

  /**
   * Currently playing now and its details
   */
  private _current!: PlayerSection;
  get current(): PlayerSection {
    return this._current;
  }
  
  /**
   * The start index of the JSONg
   */
  private _beginning!: PlayerIndex;
  get beginning(): PlayerIndex {
    return this._beginning;
  }




  //State of the player and its property observer
  private _state:PlayerState = null;
  set state(value: PlayerState){
    this._state = value
    // Draw.schedule(() => {
    //   this.onStateChange(value)
    // }, toneNow());
  }
  get state(): PlayerState{
    return this._state
  }






  //Transport and meter event handler
  private _metronome: Synth;
  private _meterBeat: number = 0
  private _sectionBeat: number = 0
  private _sectionLen: number = 0
  private _sectionLastLaunchTime: BarsBeatsSixteenths | null = null
  private _setMeterBeat(v: number){
    this._meterBeat = v
   
    const sectionLen = this._sectionLen
    const sectionBeat = this._sectionBeat = (this._sectionBeat+1) % this._sectionLen
    const sectionBar = 0
    const pos = Transport.position as BarsBeatsSixteenths
    Draw.schedule(() => {
      if(this._current){
        this.dispatchEvent(new TransportEvent('timing',pos,sectionBeat,sectionLen,sectionBar))
      }
    }, toneNow());
  }
  public getPosition(){
    return {
      beat: [this._sectionBeat, this._sectionLen],
      transportBeat: this._meterBeat,
      lastLaunchTime: this._sectionLastLaunchTime
    }
  }




  //Events

  addEventListener<K extends keyof JSONgEventsList>(
    type: K,
    listener: (ev: JSONgEventsList[K] | Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener as EventListener, options);
  }
  removeEventListener<K extends keyof JSONgEventsList>(
    type: K,
    listener: (ev: JSONgEventsList[K] | Event) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.removeEventListener(type, listener as EventListener, options);
  } 
  

  private _sectionInQueue: PlayerSection | null = null;
  private _dispatchSectionQueue(when: BarsBeatsSixteenths, to: PlayerSection | null ){
    this._sectionInQueue = to;
    this.dispatchEvent(new SectionEvent("sectionQueue",when,Transport.position.toString(), to, this._current))
  }
  private _dispatchSectionChanged(){
    console.assert(this._sectionInQueue, "no section was queued")
    this.dispatchEvent(new SectionEvent("sectionChange",Transport.position.toString(),Transport.position.toString(),this._sectionInQueue, this._current))
  }


  private _dispatchParsePhase(parsing: ParseOptions){
    this.dispatchEvent(new StateEvent({type: 'parse', parsing}))
  }







  constructor(context?: AudioContext, verbose?: VerboseLevel){
    super();
    if(context) setContext(context);
    
    this._metronome = new Synth().toDestination();
    this._log.level = verbose;
    this._log.info("[JSONg] New ", this);
    this.state = null;
  }

  get context(): AnyAudioContext{
    return getContext().rawContext
  }

//==================Loader============


public async parse(file: string | JSONgManifestFile): Promise<void> {
  
  // begin parse after confirming that manifest is ok
  // and sources paths are ok
  const [manifest,baseURL,filename] = await fetchManifest(file);
  this._log.info({manifest,baseURL, filename});

  this._dispatchParsePhase('meta')
  if (manifest?.type !== 'jsong')
    return Promise.reject(new Error('parsing invalid manifest'));
  if (!(manifest?.version in this.VERSION_SUPPORT))
    return Promise.reject(new Error('unsupported parser version'));
  if(!manifest?.playback?.bpm) 
    return Promise.reject(new Error("missing bpm"))
  if(!manifest?.playback?.meter) 
    return Promise.reject(new Error("missing meter"))

  this.state = 'parsing'
  //transfer key information from manifest to player
  // this.playingNow = null;
  this.meta = {...manifest.meta as JSONgMetadata};



  this._dispatchParsePhase('timing')
  //meter, bpm and transport setup
  const _metro = manifest.playback.metronome
  const _metro_def = {
    db: 0,
    high: 'G6',
    low: 'G5'
  }
  this._timingInfo = {
    bpm: manifest.playback.bpm,
    meter: manifest.playback.meter,
    grain: manifest.playback?.grain || (manifest.playback.meter[0] / (manifest.playback.meter[1]/4)) || 1,
    metronomeSchedule: null,
    metronome: 
      typeof _metro === 'boolean' ? 
      {
        ... _metro_def,
        db: _metro ? -6 : -120,
      } 
      : 
      typeof _metro === 'object' && _metro ? {
        db: 'db' in _metro ? _metro.db : _metro_def.db,
        high: 'high' in _metro ? _metro.high ?? _metro_def.high : _metro_def.high,
        low: 'low' in _metro ? _metro.low ?? _metro_def.low : _metro_def.low,
      } 
      : 
      {... _metro_def}
  }
  this._setMeterBeat(0)
  this._metronome.envelope.attack = 0;
  this._metronome.envelope.release = 0.05;
  this._metronome.volume.value = this.timingInfo.metronome.db
  Transport.position = '0:0:0'
  Transport.bpm.value = this._timingInfo.bpm
  Transport.timeSignature = this._timingInfo.meter


  this._dispatchParsePhase('sections')
  //build sections
  this._sections = buildSection(manifest.playback.flow, manifest.playback.map, this._timingInfo.grain);
  this._beginning = findStart(this._sections);
  this._flow = applyFlowOverrides(manifest.playback.flow);
  

  this._dispatchParsePhase('tracks')
  //spawn tracks
  this._tracksList = [...manifest.tracks]
  this._trackPlayers = []
  this._log.info('[parse][tracks]',this._tracksList)
  for(const track of this._tracksList){
    const source = track.source ? track.source : track.name;
    const v = track?.db || 0

    const a = new Player()
    const b = new Player()
    a.volume.value = v
    b.volume.value = v

    const filter = new Filter(20000, "lowpass").toDestination()
    filter.set({'Q': track?.filter?.resonance 
        ? track.filter.resonance 
        : (this._timingInfo?.filter?.resonance 
          ? this._timingInfo?.filter?.resonance 
          : 1
      )}) 
    filter.set({'rolloff': (
      track?.filter?.rolloff 
        ? track.filter.rolloff 
        : (this._timingInfo?.filter?.rolloff 
          ? this._timingInfo?.filter?.rolloff 
          : -12
        )  
    ) as FilterRollOff})

    a.connect(filter)
    b.connect(filter)

    this._trackPlayers.push({
      name: track.name, source, a,b, current: a, filter, volumeLimit: v
    })
  }


  this.manifest = JSON.parse(JSON.stringify(manifest));

  
  this._dispatchParsePhase('audio')
  //quit if there are no audio files to load
  if(!manifest?.sources || !Object.keys(manifest?.sources).length) {
    this.state = 'stopped'
    this._log.info("[parse] end - no sources",this)
    this._dispatchParsePhase('done')
    return Promise.resolve()
  }

  const manifestSourcePaths = await fetchSourcePaths(manifest, baseURL);
  if(!manifestSourcePaths?.sources){
    this._log.info('[parse] no sources listed in manifest');
  }
  else{
    this._log.info('[parse] manifest sources', manifestSourcePaths);
    // begin parse after confirming that manifest is ok
    // and sources paths are ok
    this.state = 'loading';
    //Load media
    try{
      this._sourceBuffers = await fetchSources(manifestSourcePaths);
      
      this.stop(false);

      //assign buffers to players
      this._trackPlayers.forEach((track,i)=>{
        track.a.buffer = this._sourceBuffers[track.source] as ToneAudioBuffer
        track.b.buffer = track.a.buffer
      })
    }
    catch(error){
      this.state = null;
      this._log.error(new Error('[parse][sources] error fetching data'))
      return Promise.reject('sources')
    }
  }

  //audio reset if parsing on parsed player
  // if(this.state){
    // Transport.cancel()
    // this.trackPlayers.forEach((t)=>{
    //   t.a.stop();
    //   t.b.stop();
    //   t.a.dispose()
    //   t.b.dispose()
    // })
    // if(this.verbose) console.log('[parse][sources] Audio reset')
  // }
  
  this._dispatchParsePhase('done')
  this.state = 'stopped';
  this._log.info("[parse] end ",this)
  return Promise.resolve();
}
  




























//================Controls===========

/**
 * Pending future actions on the timeline and promises
 */
private _pending: {
  scheduleAborter: null | AbortController;
  transportSchedule: null | number;
} = {
  scheduleAborter: null,
  transportSchedule: null
}

/**
 * Used to initiate the song playback.
 * After the first call from stopped state, the player is put into a playing state.
 * Any subsequent calls to play will be ignored until in the `stopped` state again.
 * @param from - You may play `from` any section or from the beginning
 */
public async play(
  from: PlayerIndex | undefined = undefined, 
)
{
  toneStart();
  
  if(this.state !== 'stopped') return
  
  const startFrom = (from || this._beginning) as PlayerIndex
  const beginning = getNestedIndex(this._sections, startFrom) as PlayerSection
  if(from && beginning === undefined) throw new Error("[play] index error for specified start point: " + from);

  Transport.cancel(0);
  Transport.position = '0:0:0'

  this.state = 'playing'
  this._current = beginning

  this._sectionLastLaunchTime = '0:0:0'
  this._schedule(this._current, '0:0:0')

  this._setMeterBeat(0)
  this._sectionBeat = -1
  this._timingInfo.metronomeSchedule = Transport.scheduleRepeat((t)=>{
    const note = this._timingInfo.metronome[!this._meterBeat ? 'high' : 'low']
    if(!note) return
    this._setMeterBeat((this._meterBeat + 1) % (Transport.timeSignature as number))
    if(this._timingInfo.metronome || this._log.level){
      try{
        this._metronome.triggerAttackRelease(note,'64n',t);
      }
      catch(e){}
    }
  },'4n');

  Transport.start()
  this._log.info("[play] player starting", startFrom)  
  // this._dispatchSectionChanged('0:0:0',null,beginning);
}


/**
 * Used to initiate the next section.
 * @param breakout - if `breakout` is true, repeat rules do not apply, 
 * if `breakout === 'offgrid'`, then timing will not be aligned to grid and will happen instantly.
 * (*not applicable if player is stopped*)
 * @param from - You may play `from` any section or from the beginning
 * @returns Promise - fired when the player switches to the queued section
 */
public async continue(breakout: (boolean) = false, to: PlayerIndex | undefined): Promise<void>{
  
  //only schedule next section if in these states
  if(!(this.state === 'playing' || this.state === 'queue')) return
  
  const nextTime =  quanTime(
    Transport.position as BarsBeatsSixteenths, 
    this._timingInfo.grain, 
    this._timingInfo?.meter, 
    !breakout ? this._sectionLastLaunchTime as string : undefined
  )
  const nextIndex = getNextSectionIndex(this._sections, to || this._current.index, typeof breakout === 'boolean' ? breakout : false)
  const nextSection = getNestedIndex(this._sections, nextIndex as NestedIndex)

  if(!nextSection) {
    throw new Error("[continue] no next section available")
  } 

  // this._dispatchSectionQueue('0:0:0',this._current);
  this._log.info("[continue] advance to next:", nextIndex)  

  this._state = 'queue'
  try{
    await this._schedule(nextSection, nextTime)
    this._sectionLastLaunchTime = Transport.position as BarsBeatsSixteenths
    // this._dispatchSectionChange();
  }
  catch{
    // this._dispatchSectionCancel();
  }
  finally{
    this._state = 'playing'
  }

  // if(loops) this.onSectionLoop(loops, nowIndex)
  // this.onSectionWillEnd([...nowIndex], nextTime)
  // this.onSectionWillStart([...nextIndex], nextTime)
  // this.onSectionChange([...nowIndex], [...nextIndex]);
  // this.onSectionDidEnd([...nowIndex])
  // this.onSectionDidStart([...nextIndex])
  // this._sectionLastLaunchTime = Transport.position as BarsBeatsSixteenths
}











public stop(synced: boolean = true)  : Promise<void> | undefined
{
  if(this.state === 'stopped' || this.state === 'stopping') return

  const next =  quanTime(
    Transport.position as BarsBeatsSixteenths, 
    this._timingInfo.grain, 
    this._timingInfo?.meter
  ) as BarsBeatsSixteenths
  const when = Time(next).toSeconds()

  return new Promise((res)=>{

  const doStop = (t: TimeUnit)=>{
    Transport.stop(t)
    Transport.cancel()
    this._trackPlayers.forEach((p,i)=>{
      try{
          p.a.stop(t);
          p.b.stop(t);
          p.current = p.a
      }catch(error){
        this._log.info('[stop] Empty track stopping ',this._tracksList[i]);
      }
    })
    this.state = 'stopped'
    this._dispatchSectionChanged()
    this._sectionLastLaunchTime = null
    
    this.state = 'stopped'
    this._log.info("[stop] player stopped")
    res()
  }

  if(synced){
    this.state = 'stopping'
    this._dispatchSectionQueue(next, null)
    Transport.scheduleOnce(doStop,when)
  }else 
    doStop(when)
    res()
  })
}











  // public skip() : void
  // {
  //   if(this.state === 'playing')
  //   this.play(null, true)
  // }

  // public skipOffGrid()  : void
  // {
  //   if(this.state === 'playing')
  //   this.play(null, 'offgrid')
  // }

  // public skipTo(index: PlayerIndex)  : void
  // {
  //   this.play(index, true);
  // }
  
  // public skipToOffGrid(index: PlayerIndex) : void
  // {
  //   if(this.state === 'playing')
  //   this.play(index, 'offgrid');
  // }


















//================Flow===========

/**
 * This function will cancel any pending changes that are queued up
 * */
public cancel(){
  this._clear()
  // this.onSectionWillEnd([], when)
  // this.onSectionWillStart([],when)
  // this.onSectionCancelChange()
}

private _clear(){
  if(this._pending.scheduleAborter) this._pending.scheduleAborter.abort()
  if(this._pending?.transportSchedule) Transport.clear(this._pending.transportSchedule)
  this._pending.scheduleAborter = null
  this._pending.transportSchedule = null
}














// async function waitForAllChanges(tracks) {
//     // Assuming schedule returns a promise that resolves when the property change is complete
//     const changePromises = tracks.map(track => schedule(track));

//     // Wait for all the promises to resolve
//     await Promise.all(changePromises);

//     // Continue with further logic here
//     console.log("All properties have been changed.");
// }

// // Example usage
// const tracks = [];
// waitForAllChanges(tracks).then(() => {
//   // Further logic after all properties have changed
//   console.log("Proceeding with further logic.");
// });



private _schedule(to: PlayerSection, forWhen: BarsBeatsSixteenths): Promise<PlayerSection> {
  this._clear()

  this._log.info('[schedule] processing',`[${to.index}]: ${to.name} @ ${forWhen}`)

  return new Promise<PlayerSection>((resolve,reject)=>{
    this._pending.scheduleAborter = new AbortController()
    this._pending.scheduleAborter.signal.addEventListener('abort',()=>{
      reject()
    })

    let trackPromises: Promise<void>[]  = []
  
    this._pending.transportSchedule = Transport.scheduleOnce((t: number)=>{

      this._clear()
     
      trackPromises = this._trackPlayers.map(track => {
        return new Promise((trackResolve)=>{
          const nextTrack = track.current === track.a ? track.b : track.a
          nextTrack.loopStart = to.region[0]+'m';
          nextTrack.loopEnd = to.region[1]+'m';
          nextTrack.loop = true;
          try{
            // const nonLegatoStart = ()=>{
              this._log.info(`[schedule] {${track.name}}[${to.index}]:${to.name} - non-legato`)
              track.current.stop(t);
              nextTrack.volume.setValueAtTime(track.volumeLimit, t)
              nextTrack.start(t,to.region[0]+'m');
              trackResolve()
            // }
            // const doLegatoStart = (legatoDT: number) => {
            //     track.current.volume.setValueAtTime(track.volumeLimit, t + legatoDT);
            //     track.current.volume.linearRampToValueAtTime(-60, t + legatoDT)
            //     track.current.stop(t + legatoDT);

            //     nextTrack.volume.setValueAtTime(-60, t + legatoDT);
            //     nextTrack.volume.linearRampToValueAtTime(track.volumeLimit, t + legatoDT)
            //     nextTrack.start(t,to.region[0]+'m');
                
            //     Transport.scheduleOnce(()=>{trackResolve()},to.region[0]+'m')
            //     // if(this.verbose >= VerboseLevel.timed) console.log(`[schedule][${track.name}(${sectionIndex})] legato x-fade`)
            // }

            // if(to?.legato){
            //   let legatoDT: number;
            //   let legatoTracks: string[] | undefined;
            //   if(typeof section?.legato === 'object'){
            //     legatoDT = Time((section?.legato?.duration || 4) + 'n').toSeconds()
            //     legatoTracks = section.legato?.xfades
            //   }
            //   else
            //     legatoDT = Time((section?.legato || 4) + 'n').toSeconds()
              
            //   if(legatoTracks){
            //     let legatoTrackFound = false
            //     legatoTracks.forEach((legatoTrack)=>{
            //       if(track.name === legatoTrack){
            //         legatoTrackFound = true
            //         doLegatoStart(legatoDT)
            //       }
            //     })
            //     if(!legatoTrackFound) nonLegatoStart()
            //   }
            //   else
            //     doLegatoStart(legatoDT)
            // }
            // else{
            //   nonLegatoStart()
            // }
            track.current = nextTrack;
          }catch{}
        })
      })
    },forWhen)

    Promise.all(trackPromises).then(()=>{
      this._current = to
      this._sectionBeat = -1
      this._sectionLen = (to.region[1] - to.region[0]) * (Transport.timeSignature as number)
      this._clear()     
      resolve(to)
    })

    // if(sectionOverrides?.skip){
    //   this._advanceSection(null, false, true)
    // }
  })

}







//================Effects===========
public rampTrackVolume(trackIndex: string | number, db: number, inTime: BarsBeatsSixteenths | TimeUnit = 0){
  return new Promise((resolve, reject)=>{
  if(!this.state) {
    reject(); return;
  }
  let idx: number | null = null;
  if(typeof trackIndex === 'string'){
    this._tracksList?.forEach((o,i)=>{
      if(o.name === trackIndex) idx = i
    })
    if(idx === null) {reject(); return; }
  }
  else if(typeof trackIndex === 'number'){
    idx = trackIndex
  }
  else return
  if(idx === null)  {reject(); return; }
  
  this._trackPlayers[idx].a.volume.linearRampTo(db,inTime, '@4n')
  this._trackPlayers[idx].b.volume.linearRampTo(db,inTime, '@4n')
  
  Draw.schedule(() => {
    resolve(trackIndex)
  }, toneNow() + Time(inTime).toSeconds());
  })
}

public rampTrackFilter(trackIndex: string | number, percentage: number, inTime: BarsBeatsSixteenths | TimeUnit = 0){
  return new Promise((resolve, reject)=>{
  if(!this.state) {reject(); return; }
  let idx: number | null = null;
  if(typeof trackIndex === 'string'){
    this._tracksList?.forEach((o,i)=>{
      if(o.name === trackIndex) idx = i
    })
    if(idx === null) {reject(); return; }
  }
  else if(typeof trackIndex === 'number'){
    idx = trackIndex
  }
  else {reject(); return; }
  if(idx === null) {reject(); return; };

  this._trackPlayers[idx].filter.frequency.linearRampTo(100 + (percentage * 19900), inTime, '@4n')
  Draw.schedule(() => {
    resolve(trackIndex)
  }, toneNow() + Time(inTime).toSeconds());
  })
}

public crossFadeTracks(outIndexes: (string | number)[], inIndexes: (string | number)[], inTime: BarsBeatsSixteenths | TimeUnit = '1m'){
  inIndexes?.forEach(i=>{
    this.rampTrackVolume(i, 0,inTime)
  })
  if(!this.state) return
  outIndexes?.forEach(i=>{
    this.rampTrackVolume(i,-50,inTime)
  }) 
}



public isMute(){
  return Destination.volume.value > -200;
}

public muteAll(){
  Destination.volume.linearRampToValueAtTime(-Infinity,'+1s');
}

public unMuteAll(value:number = 0){
  
  Destination.volume.linearRampToValueAtTime(value,'+1s');
}












//========other===========
public draw(callback: ()=>void){
  Draw.schedule(callback,toneNow());
}

}