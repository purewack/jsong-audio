
import { JSONgManifestFile, JSONgMetadata, JSONgPlaybackInfo, JSONgPlaybackMap, JSONgSection, JSONgTrack } from './types/jsong'
import { PlayerState, PlayerIndex, PlayerSectionOverrideFlags, PlayerSectionOverrides, PlayerSection, VerboseLevel } from './types/player'
import { FlowValue, NestedIndex, SectionType } from './types/common'

import quanTime from './quantime'
import nextSection from './nextSection'
import buildSection from './buildSection'
import getLoopCount from './getLoopCount'
import {getNestedIndex} from './nestedIndex'
import Logger from './logger'
import { BarsBeatsSixteenths, Time as TimeUnit } from "tone/build/esm/core/type/Units"
import {
  setContext,
  now as toneNow,
  start as toneStart,
  Player, 
  ToneAudioBuffer, 
  Filter,
  Draw, 
  Synth, Transport, FilterRollOff, Destination, Time, ToneAudioBuffers,
} from 'tone';
import fetchSources, { fetchSourcePaths } from './JSONg.sources'
import fetchManifest, { isManifestValid } from './JSONg.manifest'
import { Tone } from 'tone/build/esm/core/Tone'

/* 
parser version 0.0.3
*/

declare type PlayerEvent =
  "onSectionWillStart" | 
  "onSectionDidStart" |
  "onSectionWillEnd" | 
  "onSectionDidEnd" |
  "onSectionChange" |
  "onSectionCancelChange" |
  "onTransport" |
  "onStateChange" |
  "onSectionLoop"


export default class JSONg extends EventTarget{

  //Debug related - logging extra messages
  private _log = new Logger('warning');

  private _meta: JSONgMetadata = {
    title: 'no data',
    author: 'none',
    createdOn: 0,
    timestamp: 0,
    projectVersion: '0'
  };
  set meta(value: JSONgMetadata){
    this._meta = {...value};
  }
  get meta(): JSONgMetadata {
    return {...this._meta};
  }


  //List of track involved with the song
  private _tracksList: JSONgTrack[] = [];
  get tracksList(){return this._tracksList}

  //Audio players and sources
  private _trackPlayers:  {
    name: string;
    source: string;
    filter: Filter;
    volumeLimit: number;
    current: Player;
    a: Player;
    b: Player;
  }[] = []

  //Available real audio buffers
  private _sourceBuffers: {[key: string]: ToneAudioBuffer} = {};


  //Song playback details like BPM
  private _playbackInfo: JSONgPlaybackInfo = {bpm: 120, meter: [4,4], grain: 4};
  get playbackInfo(){return this._playbackInfo}


  //Natural flow of named sections including loop counts
  private _playbackFlow: FlowValue[] = [];
  // get playbackFlow(){return this._playbackFlow}

  //Available sections and their natural flow with extra loop counters
  private _sectionsFlowMap: SectionType = {count: 0, loop: 0, loopLimit: Infinity, index: []};
  get playbackFlowSections (){return this._sectionsFlowMap}

  //Looping details of each section, including specific directives
  private _playbackMap: JSONgPlaybackMap = {};
  get playbackMap (){return this._playbackMap;}
  

  //Extraction of flow directives
  public parsePlaybackMapOverrides(name: string): [JSONgSection, string[]] { 
    const k = name.split('-')
    return [this._playbackMap[k[0]] , k]
  }


  private getGrain(index: PlayerIndex){
    const flow = getNestedIndex(this.playbackFlowSections,index) as string; 
  }

  // private _events = new EventTarget()
  // public addEventListener = (type: PlayerEvent, listener: (...args:any)=>void)=>{
  //   this._events.addEventListener(type,listener);
  // }
  // public removeEventListener = (type: PlayerEvent, listener: (...args:any)=>void)=>{
  //   this._events.removeEventListener(type,listener);
  // }

  public getSectionInfo(index: PlayerIndex) : PlayerSection | undefined {
    const idx = index
    const flow = getNestedIndex(this.playbackFlowSections,idx) as string;
    if(!flow) return undefined;
    // const overrides = this.parsePlaybackMapOverrides(flow)[1] as PlayerSectionOverrideFlags[]
    return {name: flow, index: idx, region:this.playbackMap[flow].region, grain: 1}
  }

  //Event handlers
  private onSectionDidStart  (index: PlayerIndex){
    this.dispatchEvent(new CustomEvent<PlayerSection>('onSectionDidStart', {detail: this.getSectionInfo(index)}))
  };
  private onSectionDidEnd    (index: PlayerIndex){
    this.dispatchEvent(new CustomEvent<PlayerSection>('onSectionDidEnd', {detail: this.getSectionInfo(index)}))
  };
  private onSectionWillStart (index: PlayerIndex, when: BarsBeatsSixteenths){
    const data = this.getSectionInfo(index)
    if(data)
    this.dispatchEvent(new CustomEvent<PlayerSection>('onSectionWillStart', {detail: {when, ...data}}))
  };
  private onSectionWillEnd   (index: PlayerIndex, when: BarsBeatsSixteenths){    
    const data = this.getSectionInfo(index)
    if(data)
    this.dispatchEvent(new CustomEvent<PlayerSection>('onSectionWillEnd', {detail: {when, ...data}}))
  }; 
  // // private onSectionChange   (fromIndex: PlayerSectionIndex, toIndex: PlayerSectionIndex){
  // //   this._events.dispatchEvent(new CustomEvent('onSectionChangeIndex', {detail: {fromIndex, toIndex}}))
  // // };
  // private onSectionCancelChange  (){
  //   this._events.dispatchEvent(new Event('onSectionCancelChange'))
  // };
  // private onTransport  (position: BarsBeatsSixteenths, loopBeatPosition?: [number, number] ){
  //   this._events.dispatchEvent(new CustomEvent('onTransport', {detail: {position, loopBeatPosition}}))
  // };
  // private onStateChange  (state: PlayerPlaybackState){
  //   this._events.dispatchEvent(new CustomEvent('onStateChange', {detail: state}))
  // }
  // private onSectionLoop  (loops: number, index: PlayerSectionIndex)  {
  //   this._events.dispatchEvent(new CustomEvent('onSectionLoop', {detail: {loops, index: [...index]}}))
  // }
  // private onSectionOverrides?:    (index: PlayerSectionIndex, overrides: PlayerSectionOverrideFlags[])=>void;
  




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

  // //Currently playing now 
  // private _playingNow: PlayerSection = {index: [0], region:[0,0], grain:0, name: ''};
  // get playingNow(): PlayerPlayingNow {
  //   return this._playingNow ? {...this._playingNow} : null;
  // }
  // private set playingNow(val: PlayerPlayingNow) {
  //   this._playingNow = val;
  // } 

  //Transport and meter event handler
  private _metronome: Synth;
  private _meterBeat: number = 0
  private _sectionBeat: number = 0
  private _sectionLen: number = 0
  private _sectionLastLaunchTime?: BarsBeatsSixteenths = '0:0:0'
  private set meterBeat(v: number){
    this._meterBeat = v
    const nowIndex = [...this._sectionsFlowMap.index] as NestedIndex
    const nowSection = this.parsePlaybackMapOverrides(getNestedIndex(this._sectionsFlowMap, nowIndex) as string)[0]
    const sectionLen = this._sectionLen
    const sectionBeat = this._sectionBeat = (this._sectionBeat+1) % this._sectionLen
    const pos = Transport.position as BarsBeatsSixteenths
    // Draw.schedule(() => {
    //   if(nowSection){
    //     this.onTransport(pos, [sectionBeat,sectionLen])
    //   }
    //   else 
    //     this.onTransport(pos)
    // }, toneNow());
  }
  get meterBeat(): object {
    const nowIndex = [...this._sectionsFlowMap.index] as NestedIndex
    const nowSection = this.parsePlaybackMapOverrides(getNestedIndex(this._sectionsFlowMap, nowIndex) as string)[0]
    
    return {beat:this._meterBeat, ...nowSection}
  }




  constructor(context?: AudioContext, verbose?: VerboseLevel){
    super();
    if(context) setContext(context);
    
    this._metronome = new Synth().toDestination();
    this._log.level = verbose;
    this._log.info("[JSONg] New ", this);
    this.state = null;
  }

//==================Loader============


public async parse(file: string | JSONgManifestFile): Promise<void> {
  
  const [manifest,baseURL,filename] = await fetchManifest(file);
  this._log.info({manifest,baseURL, filename});

  if(!isManifestValid(manifest)) {
    return Promise.reject(new Error('parsing invalid manifest'));
  }

  const manifestSourcePaths = await fetchSourcePaths(manifest, baseURL);
  this._log.info('manifest sources', manifestSourcePaths);

  // begin parse after confirming that manifest is ok
  // and sources paths are ok
  this.state = 'parsing';

  //transfer key information from manifest to player
  // this.playingNow = null;
  this.meta = {...manifest.meta as JSONgMetadata};
  this._playbackInfo = {
    bpm: manifest.playback.bpm,
    meter: manifest.playback.meter,
    grain: manifest.playback?.grain || (manifest.playback.meter[0] / (manifest.playback.meter[1]/4)) || 1,
    metronome: manifest.playback?.metronome || ["B5","G4"],
    metronomeDB: manifest.playback?.metronomeDB || -6,
  }
  this._tracksList = [...manifest.tracks]
  this._playbackFlow = [...manifest.playback.flow]
  this._playbackMap = {...manifest.playback.map}
  this._sectionsFlowMap = buildSection(this._playbackFlow)


  //meter, bpm and transport setup
  this._meterBeat = 0
  this._metronome.envelope.attack = 0;
  this._metronome.envelope.release = 0.05;
  this._metronome.volume.value = this._playbackInfo.metronomeDB || 0;
  Transport.position = '0:0:0'
  Transport.bpm.value = this._playbackInfo.bpm
  Transport.timeSignature = this._playbackInfo.meter




  //spawn tracks
  this._trackPlayers = []
  this._log.info('[parse][tracks]',this._tracksList)
  for(const track of this._tracksList){
    const source = track.source ? track.source : track.name;
    const v = track?.volumeDB || 0

    const a = new Player()
    const b = new Player()
    a.volume.value = v
    b.volume.value = v

    const filter = new Filter(20000, "lowpass").toDestination()
    filter.set({'Q': track?.filter?.resonance 
        ? track.filter.resonance 
        : (this._playbackInfo?.filter?.resonance 
          ? this._playbackInfo?.filter?.resonance 
          : 1
      )}) 
    filter.set({'rolloff': (
      track?.filter?.rolloff 
        ? track.filter.rolloff 
        : (this._playbackInfo?.filter?.rolloff 
          ? this._playbackInfo?.filter?.rolloff 
          : -12
        )  
    ) as FilterRollOff})

    a.connect(filter)
    b.connect(filter)

    this._trackPlayers.push({
      name: track.name, source, a,b, current: a, filter, volumeLimit: v
    })
  }


  //Load media
  try{
    this._sourceBuffers = await fetchSources(manifestSourcePaths);
    
    this.stop(0);

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

  this.state = 'stopped';
  this._log.info("[parse] end ",this)
  return Promise.resolve();
}
  




























//================Controls===========

/**
 * Main method used to play a song and continue interaction after initial playback.
 * After the first call from stopped state, the player is put into a playing state.
 * @param from - You may play [from] any section or from the beginning
 * @param skip - if [skip] if is provided then the flow section rules do not apply,
 * @param fadein -an optional [fadein] time may be provided which takes effect only during a start from a stopped state.
 * @returns 
 */
  public play(
    from: PlayerIndex | null = null, 
    skip: (boolean | string) = false,
    fadein: TimeUnit = 0
  ) : Promise<PlayerIndex> | null
  {
    if(this.state === 'stopping') return null;
    if(this.state === 'stopped'){
      if(getNestedIndex(this._sectionsFlowMap, from || [0]) === undefined) return null;
    }

    return new Promise((resolve) => {
    
    if(this.state === 'stopped'){ 
      toneStart();
      
      this.state = 'playing'
      this._sectionsFlowMap.index = from || [0]
      const overrides = this.parsePlaybackMapOverrides(getNestedIndex(this._sectionsFlowMap, this._sectionsFlowMap.index))[1] as PlayerSectionOverrideFlags[]

      this._schedule(this._sectionsFlowMap.index, '0:0:0', ()=>{
        Draw.schedule(() => {
          this._trackPlayers.forEach((t,i)=>{
            const vol = this._tracksList[i]?.volumeDB || 0
            if(fadein){
              t.a.volume.value = -60;
              t.b.volume.value = -60;
            }
            else{
              t.a.volume.value = vol
              t.b.volume.value = vol
            }
          })
          // this?.onSectionWillEnd?.([], [], '0:0:0')
          this.onSectionWillStart(this._sectionsFlowMap.index, '0:0:0')
        },toneNow())
      }, ()=>{
        resolve(this._sectionsFlowMap.index);
        // Draw.schedule(() => {
          // this?.onSectionDidEnd?.([], [])
          this.onSectionDidStart(this._sectionsFlowMap.index)
          this._sectionLastLaunchTime = Transport.position as BarsBeatsSixteenths
        // },toneNow())
        if(!fadein) return
        this._trackPlayers.forEach((t,i)=>{
          const vol = this._tracksList[i]?.volumeDB || 0
          this.rampTrackVolume(i, vol, fadein)
        })
      })

      this.meterBeat = 0
      this._sectionBeat = -1
      Transport.scheduleRepeat((t)=>{
        const note = this._playbackInfo?.metronome?.[!this._meterBeat ? 0 : 1]
        if(!note) return
        this.meterBeat = (this._meterBeat + 1) % (Transport.timeSignature as number)
        if(this._playbackInfo.metronome && this._log.level){
          try{
            this._metronome.triggerAttackRelease(note,'64n',t);
          }
          catch(e){}
        }
      },'4n');
      Transport.position = '0:0:0'

      Transport.start()
      this._log.info("[play] player starting")  
    }
    else if(this.state === 'playing'){
      this._log.info("[play] player next", from)  
      this._advanceSection(from, skip, undefined, ()=>{
        resolve(from as PlayerIndex)
      })
    }
    })
  }













  public stop(after: TimeUnit = '4n', fadeout: boolean = true)  : void 
  {
    if(this.state === 'stopped' || this.state === 'stopping') return
    this.state = !after ? 'stopped' : 'stopping';
    const afterSec = Time(after).toSeconds()
    const when = after ? afterSec + (Time(Transport.position)).toSeconds()
    : toneNow();
    
    if(fadeout && after){
      this._trackPlayers.forEach((p,i)=>{
        this.rampTrackVolume(i,-60, afterSec);
      })
      Draw.schedule(() => {
        this.onSectionWillStart([], Time(when).toBarsBeatsSixteenths()) 
        this.onSectionWillEnd([...this._sectionsFlowMap?.index], Time(when).toBarsBeatsSixteenths())  
      }, toneNow())
    }
    const stopping = (t: TimeUnit)=>{
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
      Draw.schedule(() => {
        this.onSectionDidStart([]) 
        this.onSectionDidEnd([...this._sectionsFlowMap.index]) 
        this._sectionLastLaunchTime = undefined
      },toneNow()) 
      this.state = 'stopped'
      this._log.info("[stop] player stopped")
    }
    if(after)
      Transport.scheduleOnce(stopping,when)
    else 
      stopping(when)

  }











  public skip() : void
  {
    if(this.state === 'playing')
    this.play(null, true)
  }

  public skipOffGrid()  : void
  {
    if(this.state === 'playing')
    this.play(null, 'offgrid')
  }

  public skipTo(index: PlayerIndex, fade = '4n')  : void
  {
    this.play(index, true, fade);
  }
  
  public skipToOffGrid(index: PlayerIndex) : void
  {
    if(this.state === 'playing')
    this.play(index, 'offgrid');
  }


















//================Flow===========
  private _pending: null | {id: null | number, when: BarsBeatsSixteenths} = null;

  //This function will cancel any pending changes that are queued up
  public cancel(){
    if(!this._pending) return
    if(this._pending?.id) Transport.clear(this._pending.id)
    this._pending = null
    const when = Time(toneNow()).toBarsBeatsSixteenths()
    Draw.schedule(() => {
      this.onSectionWillEnd([], when)
      this.onSectionWillStart([],when)
      // this.onSectionCancelChange()
    }, toneNow())
  }














  private _advanceSection(index: PlayerIndex | null, breakout: string | boolean = false, auto:boolean = false, onDone?: ()=>void){
    if(this._pending) this.cancel()
    
    const nowIndex = [...this._sectionsFlowMap.index] as number[]
    if(getNestedIndex(this._sectionsFlowMap, nowIndex) === undefined) return null;
    const [nowSection, nowOverrides] = this.parsePlaybackMapOverrides(getNestedIndex(this._sectionsFlowMap, nowIndex))
  
    let _willNext = false;
    let nextOverrides: PlayerSectionOverrideFlags[]; 
    let nextIndex: PlayerIndex;
    if(index !== null){
      nextIndex = index
      nextOverrides = []
    }else{
      nextSection(this._sectionsFlowMap, typeof breakout === 'boolean' ? breakout : false)
      nextIndex = [...this._sectionsFlowMap.index]
      nextOverrides = this.parsePlaybackMapOverrides(getNestedIndex(this._sectionsFlowMap, nextIndex))[1] as PlayerSectionOverrideFlags[];
      _willNext = true;
    }
    
    this._sectionsFlowMap.index = nowIndex
    const regionGrainLength =  (nowSection.region[1] - nowSection.region[0]) * (Transport.timeSignature as number);
    const grain = auto ? regionGrainLength : nowSection?.grain
    const nextTime =  this._getNextTime(grain, !(typeof breakout === 'string' && breakout === 'offgrid'))

    this._schedule(nextIndex, nextTime, ()=>{
      if(_willNext){
        const loopIndex = [...nowIndex] as PlayerIndex
        loopIndex[loopIndex.length-1] += 1
      }
      Draw.schedule(() => {
        const loops = getLoopCount(this._sectionsFlowMap, nowIndex)
        // if(loops) this.onSectionLoop(loops, nowIndex)
        this.onSectionWillEnd([...nowIndex], nextTime)
        this.onSectionWillStart([...nextIndex], nextTime)
      }, toneNow());  
    }, ()=>{
      onDone?.()
      Draw.schedule(() => {
        // this.onSectionChange([...nowIndex], [...nextIndex]);
        this.onSectionDidEnd([...nowIndex])
        this.onSectionDidStart([...nextIndex])
        this._sectionLastLaunchTime = Transport.position as BarsBeatsSixteenths
      }, toneNow());
    }) 
  }












  private _schedule(sectionIndex: PlayerIndex, nextTime: BarsBeatsSixteenths, onPreScheduleCallback?: ()=>void, onScheduleCallback?: ()=>void){
    if(this._pending) return;
    
    this._log.info('scheduling', sectionIndex, nextTime)
    const sectionID = getNestedIndex(this._sectionsFlowMap, sectionIndex)
    const [section, sectionFlags] = this.parsePlaybackMapOverrides(sectionID)
    if(section === undefined){
      // if(this.verbose >= VerboseLevel.timed) console.warn("[schedule] non existent index");
      Draw.schedule(() => {
      //   this.onSectionWillEnd?.(null)
      //   this.onSectionWillStart?.(null)
        // this.onSectionCancelChange()
      }, toneNow())
      return;
    }

    onPreScheduleCallback?.();

    let sectionOverrides: PlayerSectionOverrides = {}
    sectionFlags.forEach((value: string) =>{
      const f = value as PlayerSectionOverrideFlags
      if(f === '>') sectionOverrides = {...sectionOverrides, autoNext: true}
      if(f === 'X' || f === 'x') sectionOverrides = {...sectionOverrides, legato: true}
    })
    // if(this.verbose >= VerboseLevel.timed) console.log('[schedule] Section overrides', sectionOverrides)
    //this.onSectionOverrides?.([...sectionIndex],[...sectionFlags as PlayerSectionOverrideFlags[]])

    // if(this.verbose >= VerboseLevel.timed) console.log('[schedule] Next schedule to happen at: ', nextTime);
    
    this._pending = {id: null, when: nextTime}
    this._pending.id = Transport.scheduleOnce((t: number)=>{
      // if(this.verbose >= VerboseLevel.timed) console.log('[schedule] Schedule done for time: ', nextTime)
      this._trackPlayers.forEach((track,i)=>{
        const nextTrack = track.current === track.a ? track.b : track.a

        nextTrack.loopStart = section.region[0]+'m';
        nextTrack.loopEnd = section.region[1]+'m';
        nextTrack.loop = true;
        try{
          const nonLegatoStart = ()=>{
            // if(this.verbose >= VerboseLevel.timed) console.log(`[schedule][${track.name}(${sectionIndex})] non-legato`)
            track.current.stop(t);
            nextTrack.volume.setValueAtTime(track.volumeLimit, t)
            nextTrack.start(t,section.region[0]+'m');
          }
          const doLegatoStart = (legatoDT: number) => {
              track.current.volume.setValueAtTime(track.volumeLimit, t + legatoDT);
              track.current.volume.linearRampToValueAtTime(-60, t + legatoDT)
              track.current.stop(t + legatoDT);

              nextTrack.volume.setValueAtTime(-60, t + legatoDT);
              nextTrack.volume.linearRampToValueAtTime(track.volumeLimit, t + legatoDT)
              nextTrack.start(t,section.region[0]+'m');
              
              // if(this.verbose >= VerboseLevel.timed) console.log(`[schedule][${track.name}(${sectionIndex})] legato x-fade`)
          }

          if(sectionOverrides?.legato){
            let legatoDT: number;
            let legatoTracks: string[] | undefined;
            if(typeof section?.legato === 'object'){
              legatoDT = Time((section?.legato?.duration || 4) + 'n').toSeconds()
              legatoTracks = section.legato?.xfades
            }
            else
              legatoDT = Time((section?.legato || 4) + 'n').toSeconds()
            
            if(legatoTracks){
              let legatoTrackFound = false
              legatoTracks.forEach((legatoTrack)=>{
                if(track.name === legatoTrack){
                  legatoTrackFound = true
                  doLegatoStart(legatoDT)
                }
              })
              if(!legatoTrackFound) nonLegatoStart()
            }
            else
              doLegatoStart(legatoDT)
          }
          else{
            nonLegatoStart()
          }
          track.current = nextTrack;
        }catch(error){
          // if(this.verbose >= VerboseLevel.timed) console.warn(`[schedule][-(${sectionIndex})] Empty playing`);
        }
      })
      // this.playingNow = {index:sectionIndex, name: sectionID};
      // if(this.verbose >= VerboseLevel.timed) console.log('[schedule] Playing now ',this.playingNow)
      onScheduleCallback?.()
      this._sectionsFlowMap.index = [...sectionIndex]
      this._sectionBeat = -1
      this._sectionLen = (section.region[1] - section.region[0]) * (Transport.timeSignature as number)
      this._pending = null

      if(sectionOverrides?.autoNext){
        this._advanceSection(null, false, true)
      }
    },nextTime)
  }










  // //TODO: add this function
  // injectNamedSection(name){
  //   if(!this.#sectionsFlowMap[name]) return null
  //   const namedIdx = ??
  //   const idx = getNestedIndex(this.#sectionsFlowMap, namedIdx)
  // }

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












//================Various==========
  private _getNextTime(grain?: number, alignGrid: boolean = true){
    const _grain = grain || this._playbackInfo?.grain || this._playbackInfo?.meter?.[0];
    const nt = quanTime(Transport.position as BarsBeatsSixteenths, _grain, this._playbackInfo?.meter, alignGrid ? this._sectionLastLaunchTime : undefined)
    // if(this.#verbose) console.log('nexttime',nt,Transport.position, _grain, this.playbackInfo?.meter, this.#sectionLastLaunchTime)
    return nt
  }

}