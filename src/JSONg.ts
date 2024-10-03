import { JSONgDataSources, JSONgFlowEntry, JSONgManifestFile, JSONgMetadata, JSONgPlaybackInfo, JSONgTrack } from './types/jsong'
import { PlayerSections, PlayerState, PlayerIndex, PlayerSection, VerboseLevel } from './types/player'
import quanTime from './quantime'
import {getNextSectionIndex,  findStart } from './nextSection'
import buildSections from './buildSection'
import {getNestedIndex} from './nestedIndex'
import Logger from './logger'
// import {fetchSources, fetchSourcePaths } from './JSONg.sources'
import fetchManifest, { isManifestValid } from './JSONg.manifest'
import { AnyAudioContext } from 'tone/build/esm/core/context/AudioContext'
import { SectionEvent, JSONgEventsList, ParseOptions, StateEvent, TransportEvent } from './types/events'

import { BarsBeatsSixteenths, Time } from "tone/build/esm/core/type/Units"
import {
  setContext,
  getContext,
  now as toneNow,
  start as toneStart,
  Player, 
  ToneAudioBuffer, 
  Filter,
  Draw, 
  Synth, Transport, FilterRollOff, Destination, Time as ToneTime, ToneAudioBuffers,
} from 'tone';
import { NestedIndex } from './types/common'
import { prependURL } from './JSONg.paths'
import { compileSourcePaths, fetchSources } from './JSONg.sources'


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
      beatDuration: number;
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
  private _flow!: JSONgFlowEntry[];
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
  public getSectionFromIndex(index: PlayerIndex): PlayerSection | undefined {
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
  private _metronome!: Synth;
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
    // this._sectionInQueue = to;
    // this.dispatchEvent(new SectionEvent("sectionQueue",when,Transport.position.toString(), to, this._current))
  }
  private _dispatchSectionChanged(){
    // console.assert(this._sectionInQueue, "no section was queued")
    // this.dispatchEvent(new SectionEvent("sectionChange",Transport.position.toString(),Transport.position.toString(),this._sectionInQueue, this._current))
  }


  private _dispatchParsePhase(parsing: ParseOptions){
    // this.dispatchEvent(new StateEvent({type: 'parse', parsing}))
  }

  constructor(context?: AudioContext, verbose?: VerboseLevel){
    super();
    if(context) setContext(context);
    
    this._log.level = verbose;
    console.log("[JSONg] new jsong player");
    this.state = null;
    toneStart()
  }

  get context(): AnyAudioContext{
    return getContext().rawContext
  }

//==================Loader============


public async loadManifest(file: string | JSONgManifestFile, options = {loadSound:true,soundOrigin:undefined}): Promise<void> {
  
  // begin parse after confirming that manifest is ok
  // and sources paths are ok
  const [manifest,baseURL,filename] = await fetchManifest(file);
  this._log.info({manifest,baseURL, filename});

  this._dispatchParsePhase('meta')
  if (manifest?.type !== 'jsong')
    return Promise.reject(new Error('parsing invalid manifest'));
  if (!this.VERSION_SUPPORT.includes(manifest?.version)){
    this._log.info(manifest)
    return Promise.reject(new Error('unsupported parser version:'));
  }
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
  function beatDuration(bpm: number, timeSignature: [number,number]) {
    const [numerator, denominator] = timeSignature;
    const secondsPerMinute = 60;
    const beatValue = 4 / denominator; 
    return (secondsPerMinute / bpm) * beatValue;;
  }

  this._timingInfo = {
    bpm: manifest.playback.bpm,
    meter: manifest.playback.meter || [4,4],
    grain: manifest.playback?.grain || (manifest.playback.meter[0] / (manifest.playback.meter[1]/4)) || 1,
    beatDuration: beatDuration(manifest.playback.bpm, manifest.playback.meter),
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

  this._metronome = new Synth().toDestination();
  this._metronome.envelope.attack = 0;
  this._metronome.envelope.release = 0.05;
  this._metronome.volume.value = this.timingInfo.metronome.db
  Transport.position = '0:0:0'
  Transport.bpm.value = this._timingInfo.bpm
  Transport.timeSignature = this._timingInfo.meter
  


  this._dispatchParsePhase('sections')
  //build sections
  this._sections = buildSections(
    manifest.playback.flow, 
    manifest.playback.map, 
    {
      grain: this._timingInfo.grain,
      fadeDuration: this.timingInfo.beatDuration * this._timingInfo.grain / 2,
      tracks: manifest.tracks.map(t => {
        if(typeof t === 'object') return t.name
        return t as string
      })
    }
  );
  this._beginning = findStart(this._sections);
  this._flow = manifest.playback.flow;

  //convert all regions to seconds
  
  

  this._dispatchParsePhase('tracks')
  //spawn tracks
  this._tracksList = [...manifest.tracks]
  this._trackPlayers = []
  this._log.info('[parse][tracks]',this._tracksList)
  for(const track of this._tracksList){
    const a = new Player()
    const b = new Player()
    a.volume.value = 0
    b.volume.value = 0
    const filter = new Filter(20000, "lowpass").toDestination()
    a.connect(filter)
    b.connect(filter)

    let info = {
      name: '',
      source: '',
      volumeLimit: 0,
    }
    if(typeof track === 'string'){
      info.source = track
      info.name = track
    }
    else{
      info.name = track.name
      info.source = track.source ? track.source : track.name;
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
    }

    this._trackPlayers.push({
      ...info, a,b, current: a, filter
    })
  }


  this.manifest = manifest

  if(manifest.sources && options.loadSound){
    await this.loadSound(manifest.sources, options?.soundOrigin || baseURL)
  }
  
  this.stop(false);
  this._dispatchParsePhase('done')
  this.state = 'stopped';
  this._log.info("[parse] end ")
  return Promise.resolve();
}
  


public async loadSound(sources: JSONgDataSources | {[key: string]: AudioBuffer} | {[key: string]: ToneAudioBuffer}, origin: string = '/'){
  this._dispatchParsePhase('audio')

  const onDone = ()=>{
    Object.keys(sources).forEach((src)=>{
      this._trackPlayers.forEach(tr => {
        if(tr.name === src){
          tr.a.buffer = this._sourceBuffers[src] as ToneAudioBuffer
          tr.b.buffer = tr.a.buffer
          console.log("[track] buffer loaded",src,tr.a.buffer)
        }
      })
    })
    this.stop(false);
    this._dispatchParsePhase('done')
    this.state = 'stopped';
  }

  //quit if there are no audio files to load
  if(!sources || !Object.keys(sources).length) {
    this._log.info("[parse] end - no sources",sources)
    return Promise.resolve()
  }

  let toneBufferCheck = false
  Object.keys(sources).forEach((s:any) => {
    if(sources[s] instanceof ToneAudioBuffer)
      toneBufferCheck = true
  }) 
  let audioBufferCheck = false
  Object.keys(sources).forEach((s:any) => {
    if(sources[s] instanceof AudioBuffer)
      audioBufferCheck = true
  }) 

  console.log("[check] results",toneBufferCheck,audioBufferCheck, sources)

  if(toneBufferCheck){
    console.log("ToneAudioBuffer loading phase")
    this._sourceBuffers = (sources as {[key: string]: ToneAudioBuffer})
    onDone()
    return
  }

  if(audioBufferCheck){
    console.log("AudioBuffer loading phase")
    let buffers: {[key:string]: ToneAudioBuffer} = {}
    Object.keys(sources).forEach((key:string) => {
      const buf = new ToneAudioBuffer()
      buf.set(sources[key] as AudioBuffer)
      buffers[key] = buf
    })
    this._sourceBuffers = buffers
    console.log("[load]",this._sourceBuffers)
    onDone()
    return
  }

  const manifestSourcePaths = await compileSourcePaths(sources as JSONgDataSources, origin);
  if(!manifestSourcePaths){
    this._log.info('[parse] no sources listed in manifest', manifestSourcePaths);
    return Promise.reject('no sources')
  }
  else if(Object.keys(manifestSourcePaths)?.length){
    this._log.info('[parse] manifest sources', manifestSourcePaths);
    // begin parse after confirming that manifest is ok
    // and sources paths are ok
    this.state = 'loading';
    //Load media
    try{
      this._sourceBuffers = await fetchSources(manifestSourcePaths);
      onDone()
    }
    catch(error){
      this.state = null;
      this._log.error(new Error('[parse][sources] error fetching data'))
      return Promise.reject('sources error')
    }
  }
}

public async addSourceData(name: string, data: any){
  this._sourceBuffers[name] = data
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
public async continue(breakout: (boolean) = false, to?: PlayerIndex): Promise<void>{
  
  //only schedule next section if in these states
  if(!(this.state === 'playing' || this.state === 'queue')) return
  
  const nextIndex = getNextSectionIndex(this._sections, to || this._current.index, typeof breakout === 'boolean' ? breakout : false)
  const nextSection = getNestedIndex(this._sections, nextIndex as NestedIndex) as PlayerSection
  const nextTime =  quanTime(
    Transport.position as BarsBeatsSixteenths, 
    nextSection.grain, 
    this._timingInfo?.meter, 
    !breakout ? this._sectionLastLaunchTime as string : undefined
  )

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
  if(this.state === null) return
  if(this.state === 'stopped' || this.state === 'stopping' ) return

  const next =  quanTime(
    Transport.position as BarsBeatsSixteenths, 
    this._timingInfo.grain, 
    this._timingInfo?.meter
  ) as BarsBeatsSixteenths
  const when = ToneTime(next).toSeconds()

  return new Promise((res)=>{

  const doStop = (t: Time)=>{
    this._trackPlayers.forEach((p,i)=>{
      try{
          p.a.stop(t);
          p.b.stop(t);
          p.current = p.a
      }catch(error){
        this._log.info('[stop] Empty track stopping ',this._tracksList[i]);
      }
    })
    Transport.stop(t)
    Transport.cancel()
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
  if(this._pending?.scheduleAborter) this._pending.scheduleAborter.abort()
  if(this._pending?.transportSchedule) Transport.clear(this._pending.transportSchedule)
  this._pending.scheduleAborter = null
  this._pending.transportSchedule = null
}













/**
 * Schedule change of sections. 
 * 
 * if no directives are set on section - The scheduler will wait until the correct time to take action using the `queue` state 
 * 
 * *or*
 * 
 * if `legato` mode on section - The scheduler will immediately transition to the next section and start the next section where the previous one left off.
 * Musically this means if the section was for example 70% of the way through, the next will start at its 70% mark.
 *
 *  *or*
 * 
 * if `fade` mode on section - The scheduler will fade the tracks using an intermediate state `transition` for the duration of the fading
 * @param to - PlayerSection to change to
 * @param forWhen - time when the change should take place, ignored if legato or fade
 * @returns  
 */
private _schedule(to: PlayerSection, forWhen: BarsBeatsSixteenths): Promise<PlayerSection> {
  this._clear()

  this._log.info('[schedule] processing',`[${to.index}]: ${to.name} @ ${forWhen}`)

  return new Promise<PlayerSection>((resolve,reject)=>{
    this._pending.scheduleAborter = new AbortController()
    this._pending.scheduleAborter.signal.addEventListener('abort',()=>{
      // reject()
    })


    let trackPromises: Promise<void>[]  = []
    
    this._clear()
    
    trackPromises = this._trackPlayers.map(track => {
      return new Promise((trackResolve)=>{

        const nextTrack = track.current === track.a ? track.b : track.a
        nextTrack.loopStart = to.region[0]+'m';
        nextTrack.loopEnd = to.region[1]+'m';
        nextTrack.loop = true;

        const onTrackResolve = ()=>{
          track.current = nextTrack;
          trackResolve()
        }

        const transitionInfo = to.transition.find(t => t.name === track.name)!

        
        if(transitionInfo.type === 'fade'){
          const t = toneNow() + 0.1

          if(transitionInfo.duration === 0){ //legato jump
            const loopStart = track.current.loopStart as number;
            const loopEnd = track.current.loopEnd  as number;
            const currentTime = track.current.context.currentTime;
            const loopDuration = loopEnd - loopStart;
            const elapsedTime = (currentTime - loopStart) % loopDuration;
            const progress = (elapsedTime / loopDuration);

            const nextLoopStart = (nextTrack as Player).loopStart as number
            const nextLoopEnd = (nextTrack as Player).loopEnd as number

            nextTrack.volume.setValueAtTime(track.volumeLimit, t)
            nextTrack.start(t,progress * (nextLoopEnd - nextLoopStart) + nextLoopStart);
            track.current.stop(t);

            onTrackResolve()
          }

          else{ //cross fade
            const dt = transitionInfo.duration
            // track.current.volume.setValueAtTime(track.volumeLimit, t + dt);
            track.current.volume.linearRampToValueAtTime(-72, t + dt)
            track.current.stop(t + dt);

            nextTrack.volume.setValueAtTime(-72, t + dt);
            nextTrack.volume.linearRampToValueAtTime(track.volumeLimit, t + dt)
            nextTrack.start(t,to.region[0]+'m');
            
            Transport.scheduleOnce(onTrackResolve,t + dt)
            // if(this.verbose >= VerboseLevel.timed) console.log(`[schedule][${track.name}(${sectionIndex})] legato x-fade`)
          }
        }
        else {
          Transport.scheduleOnce((t)=>{
            console.log("[schedule] standard schedule",t,to);
            try{
            nextTrack.start(t,to.region[0]+'m');
            }
            catch{}
            track.current.stop(t);
            onTrackResolve()
          },forWhen)
        }
      })
    })

    Promise.all(trackPromises).then(()=>{
      const pre = this._current
      this._current = to
      this._sectionBeat = -1
      this._sectionLen = (to.region[1] - to.region[0]) * (Transport.timeSignature as number)
      this._clear()    
      resolve(to)
      if(pre.once) {
        this._log.info("[schedule] current once, auto next")
        this._schedule(getNestedIndex(this._sections, to.next), '')
      }
    }).catch(()=>{
      //transition cancel, revert track fades
    })
  })

}







//================Effects===========
public rampTrackVolume(trackIndex: string | number, db: number, inTime: BarsBeatsSixteenths | Time = 0){
  return new Promise((resolve, reject)=>{
  if(!this.state) {
    reject(); return;
  }
  let idx: number | null = null;
  if(typeof trackIndex === 'string'){
    this._trackPlayers?.forEach((o,i)=>{
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
  }, toneNow() + ToneTime(inTime).toSeconds());
  })
}

public rampTrackFilter(trackIndex: string | number, percentage: number, inTime: BarsBeatsSixteenths | Time = 0){
  return new Promise((resolve, reject)=>{
  if(!this.state) {reject(); return; }
  let idx: number | null = null;
  if(typeof trackIndex === 'string'){
    this._trackPlayers?.forEach((o,i)=>{
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
  }, toneNow() + ToneTime(inTime).toSeconds());
  })
}

public crossFadeTracks(outIndexes: (string | number)[], inIndexes: (string | number)[], inTime: BarsBeatsSixteenths | Time = '1m'){
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

public mute(){
  Destination.volume.linearRampToValueAtTime(-Infinity,'+1s');
}

public unmute(value:number = 0){
  
  Destination.volume.linearRampToValueAtTime(value,'+1s');
}








//========other===========
public draw(callback: ()=>void){
  Draw.schedule(callback,toneNow());
}

}