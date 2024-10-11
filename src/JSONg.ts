import { JSONgDataSources, JSONgFlowEntry, JSONgFlowInstruction, JSONgManifestFile, JSONgMetadata, JSONgPlaybackInfo, JSONgTrack } from './types/jsong'
import { PlayerSectionGroup, PlayerState, PlayerIndex, PlayerSection, VerboseLevel, PlayerManifest as PlayerJSONg, PlayerSourcePaths, PlayerAudioSources } from './types/player'
import {beatTransportDelta, quanTime} from './util/timing'
import {getNextSectionIndex,  findStart, getIndexInfo } from './sectionsNavigation'
import buildSections from './sectionsBuild'
import {getNestedIndex, setNestedIndex} from './util/nestedIndex'
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
  Synth, Transport, FilterRollOff, Time as ToneTime, ToneAudioBuffers,
  Timeline,
  ToneEvent,
  TransportTimeClass,
  ToneAudioNode,
  Gain,
  Volume,
} from 'tone';
import { DataURIString, NestedIndex, URLString } from './types/common'
import { prependURL } from './JSONg.paths'
import { compileSourcePaths, fetchSources } from './JSONg.sources'


export default class JSONg extends EventTarget{
  
  public VERSION_SUPPORT = ["J/1"]

  
  //List of track involved with the song
  private _tracksList!: { 
    name: string;
    source: string;
  	db: number;
    audioOffsetSeconds:number;
  }[];
  get tracksList(){return this._tracksList}

  //Audio players and sources
  private _trackPlayers!:  {
    name: string;
    source: string;
    volumeLimit: number;
    current: Player;
    a: Player;
    b: Player;
    lastLoopPlayerStartTime: number;
    offset: number;
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
    }
  get timingInfo(){
    return {...this._timingInfo, metronomeSchedule: undefined}
  }


  /**
   * Looping details of each section, including specific directives
   */
  private _sections!: PlayerSectionGroup;
  get sections(){
    return this._sections;
  }
  public getSectionFromIndex(index: PlayerIndex): PlayerSection | undefined {
    return getNestedIndex(this._sections, index)
  }

  /**
   * Currently playing now and its details
   */
  private _current?: PlayerSection;
  get current() {
    return this._current;
  }

  private _next?: PlayerSection
  private _increments?: PlayerIndex[];
  get next() {
    return this._next;
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
    //   this.onStateChange(value)
  }
  get state(): PlayerState{
    return this._state
  }



  public output!: Volume


  //Transport and meter event handler
  private _metronome!: Synth;
  private _meterBeat: number = 0
  private _sectionBeat: number = 0
  private _sectionLen: number = 0
  private _sectionLastLaunchTime: BarsBeatsSixteenths | null = null
  private _setMeterBeat(v: number){
    this._meterBeat = v
    const pos = Transport.position as BarsBeatsSixteenths
    if(this._current){
      // this.dispatchEvent(new TransportEvent('timing',pos,sectionBeat,sectionLen,sectionBar))
    }
  }
  private updateSectionBeat(){
    const progress = this.getSectionProgress()
    this._sectionBeat = Math.floor(progress * this._sectionLen)
  }
  public getPosition(){
    return {
      section: [this._sectionBeat, this._sectionLen],
      countdown: this._pending.actionRemainingBeats,
      transport: {
        beat: this._meterBeat,
        transport: Transport.position.toString()
      },
      lastLaunchTime: this._sectionLastLaunchTime,
      contextTime: toneNow()
    }
  }
  public getProgression(){
    if(!this._current || !this._sections) return {}
    const info = getIndexInfo(this._sections,this._current.index) as PlayerSectionGroup
    return { 
      name: this._current.name,
      index: this._current.index,
      next: this._pending.section?.index || this._next?.index,
      increments:this._pending.increments || this._increments,
      repeatCount: info.loopCurrent,
      repeatLimit: info.loopLimit
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

  constructor(path?:string, options?: {
    onload?: ()=>void, 
    context?: AudioContext, 
    verbose?: VerboseLevel,
    disconnected?: boolean,
    debug?: boolean
  }){
    super();    
    this.state = null;

    if(options?.context) setContext(options?.context);
    
    this.output = new Volume()
    if(!options?.disconnected) this.output.toDestination()

    try{
      toneStart().then(()=>{
        if(path) this.parseManifest(path).then((manifest)=>{
          if(!manifest) throw new Error("[JSONg] Invalid manifest preload")

          this.loadManifest(manifest) 
          options?.onload?.()
          console.log("[JSONg] new jsong player created");

          const metronome = new Synth()
          metronome.envelope.attack = 0;
          metronome.envelope.release = 0.05;
          metronome.volume.value = options?.debug ? this._timingInfo.metronome.db : -200
          metronome.connect(this.output)
          this._metronome = metronome
        })
      })
    }
    catch{}
  }

  get audioContext(): AnyAudioContext{
    return getContext().rawContext
  }

//==================Loader============
public async loadManifest(manifest: PlayerJSONg, options?:{origin?: string, loadSound?: PlayerAudioSources}) {
  if (!this.VERSION_SUPPORT.includes(manifest?.version)){
    throw new Error(`[JSONg] Unsupported parser version: ${manifest?.version}`);
  }

  this._state = 'loading'
  Transport.position = '0:0:0'
  Transport.bpm.value = manifest.timingInfo.bpm
  Transport.timeSignature = manifest.timingInfo.meter
  this._setMeterBeat(-1)
  
  try{
    for(const p of this._trackPlayers){
      p.a.stop()
      p.b.stop()
      p.a.disconnect()
      p.b.disconnect()
      p.a.dispose()
      p.b.dispose()
    }
  }
  catch{}

  
  this._timingInfo = manifest.timingInfo
  this._sections = manifest.sections
  this._beginning = manifest.beginning
  this._tracksList = manifest.tracksList.map(t => {
    if(typeof t === 'object') return {
      name: t.name,
      source: t.source || t.name,
      db: t.db || 0,
      audioOffsetSeconds: t.audioOffsetSeconds || 0
    }
    else return {
      name: t,
      source: t,
      db: 0,
      audioOffsetSeconds: 0
    }
  })

  const origin = options?.origin ? options.origin : manifest.origin
  try{
    await this.loadAudio(typeof options?.loadSound === 'object' ? options.loadSound : manifest.paths, origin)
    this.state = 'stopped'
  }
  catch(e){
    this._state = null
    throw e
  }
}

public async parseManifest(file: string | JSONgManifestFile): 
Promise<PlayerJSONg | undefined>
{

  if(this._state === 'loading') return
  if(this._state === 'parsing') return

  // begin parse after confirming that manifest is ok
  // and sources paths are ok
  const [manifest,baseURL,filename] = await fetchManifest(file);
  // console.log({manifest,baseURL, filename});

  this._dispatchParsePhase('meta')
  if (manifest?.type !== 'jsong')
    throw new Error('[JSONg] Invalid manifest');
  if (!this.VERSION_SUPPORT.includes(manifest?.version))
    throw new Error(`[JSONg] Unsupported parser version: ${manifest?.version}`);
  if(!manifest?.playback?.bpm) 
    throw new Error("[JSONg] Missing bpm")
  if(!manifest?.playback?.meter) 
    throw new Error("[JSONg] Missing meter")

  const meta: JSONgMetadata = manifest.meta ? {...manifest.meta} as JSONgMetadata : {
    title: '',
    author: '',
    version: '',
    createdUsing: '',
    created: 0,
    modified: 0,
    meta: ''
  };

  this._state = 'parsing'

  this._dispatchParsePhase('timing')
  //meter, bpm and transport setup  
  const _metro_def = {
    db: -6,
    high: 'G6',
    low: 'G5'
  }
  const _metro = {..._metro_def}

  if(manifest.playback.metronome && typeof manifest.playback.metronome === 'object'){
    const nfo = manifest.playback.metronome
    if(nfo.db) _metro.db = nfo.db
    if(nfo.high) _metro.high = nfo.high
    if(nfo.low) _metro.low = nfo.low
  } 
  else if(typeof manifest.playback.metronome === 'boolean'){
    if(manifest.playback.metronome) _metro.db = -6
  }  


  function beatDuration(bpm: number, timeSignature: [number,number]) {
    const [numerator, denominator] = timeSignature;
    const secondsPerMinute = 60;
    const beatValue = 4 / denominator; 
    return (secondsPerMinute / bpm) * beatValue;;
  }

  const timingInfo = {
    bpm: manifest.playback.bpm,
    meter: manifest.playback.meter || [4,4],
    grain: manifest.playback?.grain || (manifest.playback.meter[0] / (manifest.playback.meter[1]/4)) || 1,
    beatDuration: beatDuration(manifest.playback.bpm, manifest.playback.meter),
    metronomeSchedule: null,
    metronome: _metro
  }



  this._dispatchParsePhase('sections')
  //build sections
  const sections = buildSections(
    manifest.playback.flow, 
    manifest.playback.map, 
    {
      grain: timingInfo.grain,
      fadeDuration: timingInfo.beatDuration * timingInfo.grain / 2,
      tracks: manifest.tracks.map(t => {
        if(typeof t === 'object') return t.name
        return t as string
      })
    }
  );
  const beginning = [...findStart(sections)];
  const flow = JSON.parse(JSON.stringify(manifest.playback.flow)) as JSONgFlowEntry[];
  // console.log("[manifest] sections",this._sections)
  // console.log("[manifest] flow",this._flow)
  // console.log("[manifest] start",this._beginning)
  

  //convert all regions to seconds
  this._dispatchParsePhase('tracks')

  //spawn tracks
  // console.log('[JSONg]', manifest.tracks)
  const tracksList = [...manifest.tracks]
  let extension = typeof manifest.sources === 'string' ? manifest.sources :  '.mp3'
  extension = !extension.startsWith('.') ? '.'+extension : extension;
  
  const defaultSources: PlayerSourcePaths = tracksList.reduce((acc: PlayerSourcePaths, key:any) => {
    try{
      const src = manifest.sources as JSONgDataSources
      // acc[key] = src[key]
    }
    catch{
      acc[key] = './' + key + extension
    }
    return acc;
  }, {});

  const sources = (typeof manifest.sources && typeof manifest.sources === 'object') ? {...manifest.sources} as PlayerSourcePaths : defaultSources

  this._state = null
  this._dispatchParsePhase('done')
  console.log("[JSONg] end parsing manifest")
  return Promise.resolve({
    version: manifest.version,
    meta,
    timingInfo,
    sections,
    flow,
    beginning,
    tracksList,
    paths: sources,
    origin: baseURL,
    manifest
  });
}
  



public async loadAudio(sources: JSONgDataSources | PlayerAudioSources, origin: string = '/', offset?: number){
  this._dispatchParsePhase('audio')
  this._state = 'loading'

  const trackPlayers = []
  for(const track of this._tracksList){
    const a = new Player()
    const b = new Player()
    a.volume.value = 0
    b.volume.value = 0
    a.connect(this.output)
    b.connect(this.output)
    // const filter = new Filter(20000, "lowpass").toDestination()
    // a.connect(filter)
    // b.connect(filter)

    let offsetSeconds = offset || track.audioOffsetSeconds || 0
    trackPlayers.push({
      ...track, volumeLimit: track.db, a,b, current: a, lastLoopPlayerStartTime: 0, offset: offsetSeconds, audioOffsetSeconds: undefined, db:undefined, 
    })
  }
  this._trackPlayers = trackPlayers

  const onDone = ()=>{
    Object.keys(sources).forEach((src)=>{
      this._trackPlayers.forEach(tr => {
        if(tr.name === src){
          tr.a.buffer = this._sourceBuffers[src] as ToneAudioBuffer
          tr.b.buffer = tr.a.buffer
          console.log("[JSONg] buffer loaded",src)
        }
      })
    })
    this._dispatchParsePhase('done')
    this.state = 'stopped';
    console.log("[JSONg] end loading audio ")
  }

  //quit if there are no audio files to load
  if(!sources || !Object.keys(sources).length) {
    console.log("[JSONg] end - no sources",sources)
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

  if(toneBufferCheck){
    console.log("ToneAudioBuffer loading phase")
    this._sourceBuffers = (sources as {[key: string]: ToneAudioBuffer})
    onDone()
    return
  }

  if(audioBufferCheck){
    let buffers: {[key:string]: ToneAudioBuffer} = {}
    Object.keys(sources).forEach((key:string) => {
      const buf = new ToneAudioBuffer()
      buf.set(sources[key] as AudioBuffer)
      buffers[key] = buf
    })
    this._sourceBuffers = buffers
    console.log("[JSONg]",this._sourceBuffers)
    onDone()
    return
  }
  const manifestSourcePaths = await compileSourcePaths(sources as JSONgDataSources, origin);
  if(!manifestSourcePaths){
    console.log('[JSONg] no sources listed in manifest', manifestSourcePaths);
    return Promise.reject('no sources')
  }
  else if(Object.keys(manifestSourcePaths)?.length){
    console.log('[JSONg] manifest sources', manifestSourcePaths);
    // begin parse after confirming that manifest is ok
    // and sources paths are ok
    this.state = 'loading';
    //Load media
    try{
      this._sourceBuffers = await fetchSources(manifestSourcePaths);
      onDone()
      this.stop(false)
    }
    catch(error){
      this.state = null;
      console.error('[JSONg]',manifestSourcePaths)
      console.error(new Error('[JSONg] error fetching data'))
      throw error
    }
  }
}


























//================Controls===========

/**
 * Pending future actions on the timeline and promises
 */
private _pending: {
  scheduleAborter: AbortController;
  transportSchedule: null | number;
  scheduledEvents: number[],
  actionRemainingBeats: number,
  section: PlayerSection | null,
  increments: PlayerIndex[] | null,
} = {
  scheduleAborter: new AbortController(),
  transportSchedule: null,
  scheduledEvents: [],
  actionRemainingBeats: 0,
  section: null,
  increments: null,
}



/**
 * Used to initiate the song playback.
 * After the first call from stopped state, the player is put into a playing state.
 * Any subsequent calls to play will be ignored until in the `stopped` state again.
 * @param from - You may play `from` any section or from the beginning if unspecified
 * @returns Promise - awaits the player to finish playing 
 * in the case that the beginning section has a `once` directive.
 * 
 * Throws on cancellation, i.e. the `stop` command
 */
public async play(
  from?: PlayerIndex 
) 
: Promise<void>
{
  toneStart();
  
  if(this.state !== 'stopped') return
  
  const startFrom = (from || this._beginning) as PlayerIndex
  const beginning = getNestedIndex(this._sections, startFrom) as PlayerSection
  if(from && beginning === undefined) throw new Error("[JSONg] index error for specified start point: " + from);

  Transport.cancel(0);
  Transport.position = '0:0:0'

  this._setMeterBeat(-1)
  this._sectionBeat = 0
  this._sectionLen = (beginning.region[1] - beginning.region[0]) * this._timingInfo.meter[0]
  this._timingInfo.metronomeSchedule = Transport.scheduleRepeat((t)=>{
    this._setMeterBeat((this._meterBeat + 1) % this._timingInfo.meter[0])
    if(this._sectionLen) 
      this.updateSectionBeat()
    if(this._pending.actionRemainingBeats) 
      this._pending.actionRemainingBeats -= 1
    const note = this._timingInfo.metronome[this._meterBeat === 0 ? 'high' : 'low']
    if(this._timingInfo.metronome){
      try{
        this._metronome.triggerAttackRelease(note,'64n',t);
      }
      catch(e){}
    }
  },this._timingInfo.meter[1] + 'n');

  Transport.start()
  this._clear()
  await this._schedule(beginning, '0:0:0')
  this._current = beginning
  this.state = 'playing'
  this._sectionLastLaunchTime = '0:0:0'
  this._current = beginning
  console.log("[JSONg] started from", startFrom)
  
  if(beginning.once){
    console.log("[JSONg] starting section once, continue")
    this.state = 'continue'
    await this._continue()
  }
  // this._dispatchSectionChanged('0:0:0',null,beginning);
}


/**
 * Used to initiate the next section.
 * (*not applicable if player is stopped*)
 * @param breakout - if `breakout` is true, repeat rules do not apply, 
 * 
 * You may also continue `to` any section or advance to the next logical section automatically
 * 
 * If `to` is specified, repeat counters are ignored
 * @returns Promise - fired when the player switches to the queued section or throws if section schedule is cancelled
 */
public async continue(breakout: (boolean | PlayerIndex) = false): Promise<void>{
  //only schedule next section if in these states
  if(this.state !== 'playing') return
  await this._continue(breakout)
}


private async _continue(breakout: (boolean | PlayerIndex) = false): Promise<void>{

  if(!this._current) throw new Error("[JSONg] current section non-existent")

  const from = this._current
  const {next: nextIndex, increments} =  getNextSectionIndex(this._sections, this._current.index)!
  const nextSection = getNestedIndex(this._sections, breakout ? this._current.next : nextIndex) as PlayerSection
  if(!nextSection) {
    throw new Error("[JSONg] no next section available")
  }   
  
  if(breakout){
    this._pending.section = getNestedIndex(this._sections, this._current.next)
    this._pending.increments = null
  }
  else{
    this._pending.section = nextSection
    this._pending.increments = increments
  }

  const nextTime =  quanTime(
    Transport.position as BarsBeatsSixteenths, 
    this._current.grain, 
    this._timingInfo?.meter, 
    this._sectionLastLaunchTime as string
  )

  // this._dispatchSectionQueue('0:0:0',this._current);
  console.log("[JSONg] advance to next:",this._current.index, ">", nextSection.index)  

  if(this.state === 'playing') 
    this.state = 'queue'

  await this._schedule(nextSection, nextTime)
  this._current = nextSection

  if(increments.length && !breakout){
    increments.forEach(ii => {
      const info = ii.length === 0 ? this._sections : (getIndexInfo(this._sections, ii) as PlayerSectionGroup)
      info.loopCurrent += 1
      if(info.loopCurrent >= info.loopLimit){
        info.loopCurrent = 0
      }
      setNestedIndex(info.loopCurrent, this._sections, [...ii,'loopCurrent'])
      console.log("[JSONg] group repeat counter increment", `${info.loopCurrent}/${info.loopLimit}`, ii,)
    })
  }

  if(this._current.once) {
    this.state = 'continue'
    await this._continue()
  }
  else
  {
    const {next, increments} =  getNextSectionIndex(this._sections, this._current.index)!
    const nextSection = getNestedIndex(this._sections, breakout ? this._current.next : next) as PlayerSection
    if(nextSection) {
      this._next = nextSection
      this._increments = increments
    }   
  }
  
  this._pending.increments = null
  this._pending.section = null
  this.state = 'playing'
    // this._dispatchSectionChange();
  // if(loops) this.onSectionLoop(loops, nowIndex)
  // this.onSectionWillEnd([...nowIndex], nextTime)
  // this.onSectionWillStart([...nextIndex], nextTime)
  // this.onSectionChange([...nowIndex], [...nextIndex]);
  // this.onSectionDidEnd([...nowIndex])
  // this.onSectionDidStart([...nextIndex])
  // this._sectionLastLaunchTime = Transport.position as BarsBeatsSixteenths
}











public async stop(synced: boolean = true)  : Promise<PlayerSection | undefined>
{
  if(this.state === null) return
  if(this.state === 'stopped' || this.state === 'stopping' ) return

  return new Promise((res,rej)=>{
  if(!this._current) {
    rej()
    return
  }

  this._clear()
  this._abort()

  const {signal} = this._pending.scheduleAborter
  
  const onCancelStop = ()=>{
    rej()
    this.state = 'playing'
    console.log("[JSONg] stop cancelled")
    this._pending.actionRemainingBeats = 0
    this._pending.scheduledEvents.forEach(e => {
      Transport.clear(e)
    })
  }

  const doStop = (t: Time)=>{
  
    signal.removeEventListener('abort',onCancelStop)
    this._trackPlayers.forEach((p,i)=>{
      try{
          p.a.stop(t);
          p.b.stop(t);
          p.current = p.a
      }catch(error){
      }
    })
    Transport.stop(t)
    Transport.cancel()
    this.state = 'stopped'
    this._dispatchSectionChanged()
    this._sectionLastLaunchTime = null
    this._sectionBeat = 0
    this._pending.actionRemainingBeats = 0
    this._pending.scheduledEvents = []
    console.log("[JSONg] stopped")
    res(this._current)
  }

  if(synced){
    const next =  quanTime(
      Transport.position.toString() as BarsBeatsSixteenths, 
      this._current.grain, 
      this._timingInfo?.meter,
      this._sectionLastLaunchTime as string
    ) as BarsBeatsSixteenths
    const when = ToneTime(next).toSeconds()
    
    signal.addEventListener('abort',onCancelStop)
    console.log("[JSONg] stopping at",next)
    this._dispatchSectionQueue(next, null)
    this._pending.scheduledEvents.push(Transport.scheduleOnce(doStop,next))
    this.state = 'stopping'
    this._pending.actionRemainingBeats = beatTransportDelta(Transport.position.toString(), next, this._timingInfo.meter)      
  }else {
    signal.addEventListener('abort',onCancelStop)
    doStop(toneNow())
    res(this._current)
  }
})
}




//================Flow===========

/**
 * This function will cancel any pending changes that are queued up
 * */
public cancel(){
  this._abort()
  this.state = 'playing'
  // this._clear()
  // this.onSectionWillEnd([], when)
  // this.onSectionWillStart([],when)
  // this.onSectionCancelChange()
}

private _abort(){
  this._pending.actionRemainingBeats = 0
  if(this._pending.scheduleAborter) {
    this._pending.scheduleAborter.abort()
  }
  this._pending.scheduleAborter = new AbortController()
}

private _clear(){
  if(this._pending?.transportSchedule) Transport.clear(this._pending.transportSchedule)
  this._pending.scheduledEvents.forEach(v => {
    Transport.clear(v)
  })
  this._pending.scheduledEvents = []
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
private _schedule(to: PlayerSection, forWhen: BarsBeatsSixteenths): Promise<void> {

  return new Promise<void>((resolveAll,rejectAll)=>{

    // console.log('[schedule] processing',`[${to.index}]: ${to.name} @ ${forWhen} now(${Transport.position.toString()})`)
    const signal = this._pending.scheduleAborter.signal

    let trackPromises: Promise<void>[]  = []
    
    // console.log("[schedule] starting task",toneNow())
    trackPromises = this._trackPlayers.map(track => {
      return new Promise((trackResolve, trackReject)=>{

        const nextTrack = track.current === track.a ? track.b : track.a

        nextTrack.loopStart = ToneTime(to.region[0]+'m').toSeconds() + track.offset;
        nextTrack.loopEnd = ToneTime(to.region[1]+'m').toSeconds() + track.offset;
        nextTrack.loop = true;

        const onTrackResolve = (time: number)=>{
          track.current.stop(time)
          track.current = nextTrack;
          // console.log("[schedule] resolved", track)
          trackResolve()
        }

        let scheduleEvent = -1
        const onAbort = ()=>{
          // console.info("[schedule] abort",track.name)
          Transport.clear(scheduleEvent)
          // this._pending.scheduledEvents.filter((v)=>v !== e)
          if(this.state === 'transition'){
          const transitionInfo = this._current!.transition.find(t => t.name === track.name)!
          const dt = (transitionInfo?.duration || 1)
          nextTrack.stop(toneNow() + dt)
          nextTrack.volume.cancelScheduledValues(toneNow())
          track.current.volume.cancelScheduledValues(toneNow())
          nextTrack.volume.linearRampToValueAtTime(-72, toneNow() + dt )
          track.current.volume.linearRampToValueAtTime(track.volumeLimit,toneNow() +  dt)
          }

          trackReject()
        }

        const normalStart = ()=>{
          this._pending.actionRemainingBeats = beatTransportDelta(Transport.position.toString(), forWhen, this._timingInfo.meter)
          scheduleEvent = Transport.scheduleOnce((t)=>{
            track.a.volume.setValueAtTime(track.volumeLimit,t)
            track.b.volume.setValueAtTime(track.volumeLimit,t)
            try{
            nextTrack.start(t,nextTrack.loopStart);
            track.lastLoopPlayerStartTime = t
            // console.log("[schedule] standard schedule @",t,to);
            }
            catch(e){
              console.error(e)
            }
            this._sectionLastLaunchTime = Transport.position.toString()
            this._sectionLen = (to.region[1] - to.region[0]) * this._timingInfo.meter[0]
            this._sectionBeat = 0
            onTrackResolve(t)
            signal.removeEventListener('abort',onAbort)
            // this._pending.scheduledEvents.filter((v)=>v !== e)
          },forWhen)
          // this._pending.scheduledEvents.push(e)

          signal.addEventListener('abort',onAbort)
        }

        if(this._sectionLastLaunchTime === null){
          normalStart()
          return
        }

        const transitionInfo = this._current!.transition.find(t => t.name === track.name)!
        if(transitionInfo.type === 'fade'){
          const t = toneNow()
          
          const progress = this.getSectionProgress(track) || 0

          this._sectionLen = (to.region[1] - to.region[0]) * this._timingInfo.meter[0]
          
          const nextLoopStart = ToneTime((nextTrack as Player).loopStart).toSeconds()
          const nextLoopEnd = ToneTime((nextTrack as Player).loopEnd).toSeconds()
          const nextLoopDuration = nextLoopEnd - nextLoopStart

          const whereFrom = (progress * nextLoopDuration) + nextLoopStart
           
          // console.info("[track]",{transport: ToneTime(Transport.progress.toString()).toSeconds(), nextLoopDuration,nextLoopStart,nextLoopEnd, progress, whereFrom})

          const dt = transitionInfo.duration
          if(dt){
            this.state = 'transition'
          }

          nextTrack.volume.setValueAtTime(-72, t);
          nextTrack.volume.linearRampToValueAtTime(track.volumeLimit, t + dt);
          track.current.volume.setValueAtTime(track.volumeLimit, t);
          track.current.volume.linearRampToValueAtTime(-72, t + dt);   

          nextTrack.start(t,whereFrom); 

          this._pending.actionRemainingBeats = Math.floor(dt / this._timingInfo.beatDuration)
          const transitionForWhen = (ToneTime(Transport.position).toSeconds() + dt)
         
          scheduleEvent = Transport.scheduleOnce((t)=>{
            onTrackResolve(t)
            signal.removeEventListener('abort',onAbort)
          },transitionForWhen)
          signal.addEventListener('abort',onAbort)
          
          track.lastLoopPlayerStartTime = t - whereFrom
        }
        else {
          normalStart()
        }
      })
    })


    Promise.all(trackPromises).then(()=>{
      this._clear()
      resolveAll()      
      // console.log("[schedule] END",toneNow())
    }).catch(()=>{
      //transition cancel, revert track fades
      rejectAll()
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

// public rampTrackFilter(trackIndex: string | number, percentage: number, inTime: BarsBeatsSixteenths | Time = 0){
//   return new Promise((resolve, reject)=>{
//   if(!this.state) {reject(); return; }
//   let idx: number | null = null;
//   if(typeof trackIndex === 'string'){
//     this._trackPlayers?.forEach((o,i)=>{
//       if(o.name === trackIndex) idx = i
//     })
//     if(idx === null) {reject(); return; }
//   }
//   else if(typeof trackIndex === 'number'){
//     idx = trackIndex
//   }
//   else {reject(); return; }
//   if(idx === null) {reject(); return; };

//   this._trackPlayers[idx].filter.frequency.linearRampTo(100 + (percentage * 19900), inTime, '@4n')
//   Draw.schedule(() => {
//     resolve(trackIndex)
//   }, toneNow() + ToneTime(inTime).toSeconds());
//   })
// }

public crossFadeTracks(outIndexes: (string | number)[], inIndexes: (string | number)[], inTime: BarsBeatsSixteenths | Time = '1m'){
  inIndexes?.forEach(i=>{
    this.rampTrackVolume(i, 0,inTime)
  })
  if(!this.state) return
  outIndexes?.forEach(i=>{
    this.rampTrackVolume(i,-50,inTime)
  }) 
}

public toggleMetronome(state?:boolean){
  let vol = this._timingInfo.metronome.db
  if(state !== undefined){
    vol = state ? this._timingInfo.metronome.db : -200
  }
  else{
    this._metronome.volume.value = this._metronome.volume.value < -100 ? this._timingInfo.metronome.db : -200
  }
}

public isMute(){
  return this.output.volume.value >= -200;
}

public mute(){
  this.output.volume.linearRampToValueAtTime(-Infinity,'+1s');
}

public unmute(value:number = 0){
  this.output.volume.linearRampToValueAtTime(value,'+1s');
}







//========other===========
public safeCallback(callback: ()=>void){
  Draw.schedule(callback,toneNow());
}


public getSectionProgress(track?: {
  name: string;
  source: string;
  volumeLimit: number;
  current: Player;
  a: Player;
  b: Player;
  lastLoopPlayerStartTime: number;
  offset: number;
}) {
  const _track = track || this._trackPlayers[0]
  if (_track.lastLoopPlayerStartTime === null && _track.current.state === 'started') return 0; // If the player hasn't started, progress is 0%
  const currentTime = toneNow() // Get the current time
  const elapsedTime = currentTime - _track.lastLoopPlayerStartTime; // Calculate elapsed time
  const loopDuration = ToneTime(_track.current.loopEnd).toSeconds() - ToneTime(_track.current.loopStart).toSeconds() ; // Loop duration in seconds
  const loopProgress = (elapsedTime % loopDuration) / loopDuration ; // Calculate loop progress as a percentage
  return loopProgress
}

public get(key: string):any{
  switch(key){
    case 'timeline':
      return Transport.position.toString()

    case 'players':
      return this._trackPlayers
    
    default:
      return undefined
  }
}

}