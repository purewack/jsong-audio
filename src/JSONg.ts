import { JSONgDataSources, JSONgFlowEntry, JSONgManifestFile, JSONgMetadata} from './types/jsong'
import { PlayerSectionGroup, PlayerState, PlayerIndex, PlayerSection, VerboseLevel, PlayerManifest as PlayerJSONg, PlayerSourcePaths, PlayerAudioSources } from './types/player'
import {beatTransportDelta, quanTime} from './util/timing'
import {getNextSectionIndex,  findStart, getIndexInfo } from './sectionsNavigation'
import buildSections from './sectionsBuild'
import {getNestedIndex, setNestedIndex} from './util/nestedIndex'
import fetchManifest from './JSONg.manifest'
import { JSONgEventsList, ParseOptions, StateEvent, TransportEvent, ClickEvent, QueueEvent, CancelQueueEvent, ChangeEvent, RepeatEvent, LoopEvent, ParseEvent } from './types/events'
import { compileSourcePaths, fetchSources } from './JSONg.sources'
import { AnyAudioContext } from 'tone/build/esm/core/context/AudioContext'
import { BarsBeatsSixteenths, Time } from "tone/build/esm/core/type/Units"
import {
  setContext,
  getContext,
  now as toneNow,
  start as toneStart,
  Player, 
  ToneAudioBuffer, 
  Synth, Time as ToneTime,
  Volume,
  getTransport,
  getDraw, 
} from 'tone';


export default class JSONg extends EventTarget{
  
  public VERSION_SUPPORT = ["J/1"]
  public verbose: boolean = false;
  
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
    output: Volume;
    current: Player;
    a: Player;
    b: Player;
    lastLoopPlayerStartTime: number;
    offset: number;
  }[]
  get tracks() {
    return this._trackPlayers.reduce((acc:{[key:string]: Volume},t) =>{
      acc[t.name] = t.output
      return acc
    },{})
  }


  //Available real audio buffers
  private _sourceBuffers!: {[key: string]: ToneAudioBuffer};



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
  private _current!: PlayerSection;
  get current() {
    return this._current;
  }

  private _next?: PlayerSection
  private _increments?: PlayerIndex[];
  get next() {
    return [this._next, this._increments] as const;
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
  private set state(value: PlayerState){
    this.dispatchEvent(new StateEvent({now: value, prev: this._state}))
    this._state = value
  }
  get state(): PlayerState{
    return this._state
  }



  public output!: Volume


  //Song playback details like BPM
  private _timingInfo!: {
    bpm: number;
    meter: [number, number];
    grain: number;
    beatDuration: number;
    metronome: {db: number, high: string, low: string, enabled: boolean};
  }
  get timingInfo(){
    return {...this._timingInfo}
  }

  //Transport and meter event handler
  private _metronome!: Synth;
  private _metronomeSchedule?: number;
  private _meterBeat: number = 0
  private _sectionBeat: number = 0
  private _sectionLen: number = 0
  private _sectionLastLaunchTime: BarsBeatsSixteenths | null = null
  private _setMeterBeat(v: number){
    this._meterBeat = v
    const tr = getTransport().position as BarsBeatsSixteenths
    }
  private updateSectionBeat(){
    const progress = this._getSectionProgress()
    this._sectionBeat = Math.floor(progress * this._sectionLen)
    
  }
  public getPosition(){
    return {
      section: [this._sectionBeat, this._sectionLen],
      countdown: this._pending.actionRemainingBeats,
      transport: {
        beat: this._meterBeat,
        transport: getTransport().position.toString()
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
  public getSectionProgress(){
    return this._sectionBeat / this._sectionLen
  }
  
  private _getSectionProgress(track?: {
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



  //Events

  addEventListener<K extends keyof JSONgEventsList>(
    type: K,
    listener: (ev: JSONgEventsList[K] ) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener as EventListener, options);
  }
  removeEventListener<K extends keyof JSONgEventsList>(
    type: K,
    listener: (ev: JSONgEventsList[K] ) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.removeEventListener(type, listener as EventListener, options);
  } 
  
  private _parsePhaseOld: ParseOptions = null;
  private _dispatchParsePhase(parsing: ParseOptions){
    this.dispatchEvent(new ParseEvent({now: parsing, prev: this._parsePhaseOld}))
    this._parsePhaseOld = parsing;
  }





  constructor(path?:string, options?: {
    onload?: ()=>void, 
    context?: AudioContext, 
    verbose?: boolean,
    disconnected?: boolean,
    debug?: boolean
  }){
    super();    
    this.state = null;
    this.verbose = options?.verbose === true;

    if(options?.context) setContext(options?.context);
    
    this.output = new Volume()
    if(!options?.disconnected) this.output.toDestination()

    try{
      toneStart().then(()=>{
        if(path) this.parseManifest(path).then((manifest)=>{
          if(!manifest) throw new Error("[JSONg] Invalid manifest preload")

          this.useManifest(manifest) 
          options?.onload?.()
          if(this.verbose) console.log("[JSONg] new jsong player created");

          const metronome = new Synth()
          metronome.envelope.attack = 0;
          metronome.envelope.release = 0.05;
          metronome.volume.value = this._timingInfo.metronome.db
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

/**
 * This function allows you to pre process a manifest file in the background, 
 * in order to check if the file is adequate for loading into the player. 
 * This gives you the ability to preload the file as to not interrupt the player. 
 * You can even preload several files and all their audio sources for hot-swapping them 
 * without interrupting audio playback.
 * 
 * @param file - either a string or an already parsed JSON file as a JavaScript object.
 * @returns `Promise` with a resulting JS object that contains all necessary details to load a song into the player. Use this later with the `useManifest` function.
 */
public async parseManifest(file: string | JSONgManifestFile): 
Promise<PlayerJSONg | undefined>
{

  if(this._state === 'applying') return
  if(this._state === 'loading') return

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

  this._dispatchParsePhase('done-meta')
  this._dispatchParsePhase('timing')
  //meter, bpm and transport setup  
  const _metro_def = {
    db: -6,
    high: 'G6',
    low: 'G5',
    enabled: false
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

  this._dispatchParsePhase('done-timing')
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
      }),
      beatsInMeasure: timingInfo.meter[0]
    }
  );
  
  const beginning = [...findStart(sections)];
  const flow = JSON.parse(JSON.stringify(manifest.playback.flow)) as JSONgFlowEntry[];
  // console.log("[manifest] sections",this._sections)
  // console.log("[manifest] flow",this._flow)
  // console.log("[manifest] start",this._beginning)
  
  this._dispatchParsePhase('done-sections')
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

  this._dispatchParsePhase('done-tracks')
  if(this.verbose) console.log("[JSONg] end parsing manifest")
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
  


/**
 * This function uses pre-parsed manifest files in order to actually 
 * load the player with music information. You can provide options which are there 
 * to stop the default behaviour of trying to load audio sources from the manifest.
 * You can manually create the appropriate audio buffers and either feed them later using 
 * `useAudio` or provide them here using `options.loadSound`.

 * @param manifest a JS object retured by a successful call to `parseManifest()`
 * @param options an optional option set for directing the player on if / how to load audio sources. You can provide the origin url which is used as a base to fetch audio files from. You can also provide a whole object full of audio buffers to be used by the player
 */
public async useManifest(manifest: PlayerJSONg, options?:{origin?: string, loadSound?: PlayerAudioSources}) {
  if (!this.VERSION_SUPPORT.includes(manifest?.version)){
    throw new Error(`[JSONg] Unsupported parser version: ${manifest?.version}`);
  }

  this.state = 'applying'
  getTransport().position = '0:0:0'
  getTransport().bpm.value = manifest.timingInfo.bpm
  getTransport().timeSignature = manifest.timingInfo.meter
  this._setMeterBeat(-1)
  
  this._stop(toneNow())
  try{
    for(const p of this._trackPlayers){
      p.a.disconnect()
      p.b.disconnect()
      p.output.disconnect()
      p.output.dispose()
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
    await this.useAudio(typeof options?.loadSound === 'object' ? options.loadSound : manifest.paths, origin)
    this.state = 'stopped'
    if(this.verbose) console.log("[JSONg] loaded",manifest)
  }
  catch(e){
    this.state =null
    throw e
  }
}

/**
 * This section is used internally by `useManifest` as a default strategy to loading audio sources. 
 * You can specify that `useManifest` should not load audio, and proceed to do so manually. 
 * This is useful for other applications which could for example use Electron.js and load files that 
 * are local on the user's machine.
 * 
 * @param sources  a set of key pair values, keys are track names as strings, values are either:
 * - *a URL to the file, where the `origin` parameter is considered if provided*
 * - *a `ToneAudioBuffer` which can also use a URL to fetch audio data* 
 * - *an AudioBuffer that is manually loaded with the correct audio data, this is likely to be done using the player's [`AudioContext.decodeAudioData()`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)*
 * @param origin  a base URL host to fetch files from
 * @param offset you can offset the audio source in seconds. This is useful if the audio file has silent `whitespace` at the beginning, which is often a case with mp3 files generated using cetrain encoders
 * @returns 
 */
public async useAudio(sources: JSONgDataSources | PlayerAudioSources, origin: string = '/', offset?: number){
  this._dispatchParsePhase('audio')
  const prevState = this._state
  this.state ='loading'

  const onDone = ()=>{ 
    this._stop(toneNow())
    try{
      for(const p of this._trackPlayers){
        p.a.disconnect()
        p.b.disconnect()
        p.output.disconnect()
        p.output.dispose()
        p.a.dispose()
        p.b.dispose()
      }
    }
    catch{}
    
    const trackPlayers = []
    for(const track of this._tracksList){
      const a = new Player()
      const b = new Player()
      const out = new Volume()
      a.volume.value = track.db
      b.volume.value = track.db
      a.connect(out)
      b.connect(out)
      out.connect(this.output)

      let offsetSeconds = offset || track.audioOffsetSeconds || 0
      trackPlayers.push({
        ...track, volumeLimit: track.db, a,b, output: out, current: a, lastLoopPlayerStartTime: 0, offset: offsetSeconds, audioOffsetSeconds: undefined, db:undefined, 
      })
    }
    this._trackPlayers = trackPlayers
   

    Object.keys(sources).forEach((src)=>{
      this._trackPlayers.forEach(tr => {
        if(tr.name === src){
          tr.a.buffer = this._sourceBuffers[src] as ToneAudioBuffer
          tr.b.buffer = tr.a.buffer
          if(this.verbose) console.log("[JSONg] buffer loaded",src)
        }
      })
    })
    this._dispatchParsePhase('done-audio')
    if(this.verbose) console.log("[JSONg] end loading audio ")
    this._abort()
    this._clear()
    this._stop(toneNow())
  }

  //quit if there are no audio files to load
  if(!sources || !Object.keys(sources).length) {
    if(this.verbose) console.log("[JSONg] end - no sources",sources)
    this.state = prevState
    return
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
    // console.log("ToneAudioBuffer loading phase")
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
    // console.log("[JSONg]",this._sourceBuffers)
    onDone()
    return
  }
  const manifestSourcePaths = await compileSourcePaths(sources as JSONgDataSources, origin);
  if(!manifestSourcePaths){
    if(this.verbose) console.log('[JSONg] no sources listed in manifest', manifestSourcePaths);
    return Promise.reject('no sources')
  }
  else if(Object.keys(manifestSourcePaths)?.length){
    // console.log('[JSONg] manifest sources', manifestSourcePaths);
    // begin parse after confirming that manifest is ok
    // and sources paths are ok
    this.state = 'loading';
    //Load media
    try{
      this._sourceBuffers = await fetchSources(manifestSourcePaths);
      onDone()
    }
    catch(error){
      this.state = null
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
 * (*not applicable if player is already playing*)
 * 
 * After the first call from stopped state, the player is put into a playing state.
 * Any subsequent calls to play will be ignored until in the `stopped` state again.
 * 
 * @param from - You may play `from` any section or from the beginning if unspecified
 * @returns Promise - awaits the player to finish playing 
 * in the case that the beginning section has a `once` directive.

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

  getTransport().cancel(0);
  getTransport().position = '0:0:0'

  this._setMeterBeat(-1)
  this._sectionBeat = 0
  this._sectionLen = (beginning.region[1] - beginning.region[0]) * this._timingInfo.meter[0]
  if(this._metronomeSchedule) getTransport().clear(this._metronomeSchedule)
  this._metronomeSchedule = getTransport().scheduleRepeat((t)=>{
    this._setMeterBeat((this._meterBeat + 1) % this._timingInfo.meter[0])
    
    if(this._sectionLen)
      this.updateSectionBeat()
    
    this.audioSafeCallback(()=>{
      this.dispatchEvent(new ClickEvent([this._meterBeat+1, this._timingInfo.meter[0]]))
      this.dispatchEvent(new TransportEvent(
        [this._sectionBeat+1, this._sectionLen],
        this._pending.actionRemainingBeats > 0 ? this._pending.actionRemainingBeats : undefined
      ))
    })

    if(this._pending.actionRemainingBeats) 
      this._pending.actionRemainingBeats -= 1

    const note = this._timingInfo.metronome[this._meterBeat === 0 ? 'high' : 'low']
    if(this._timingInfo.metronome && this._timingInfo.metronome.enabled){
      try{
        this._metronome.triggerAttackRelease(note,'64n',t);
      }
      catch(e){}
    }
  },this._timingInfo.meter[1] + 'n');

  getTransport().start()
  this._clear()
  await this._schedule(beginning, '0:0:0')
  this.dispatchEvent(new ChangeEvent(beginning, undefined))
  this._current = beginning
  this.state = 'playing'
  this._sectionLastLaunchTime = '0:0:0'
  this._current = beginning
  
  if(this.verbose) console.log("[JSONg] started from index", startFrom)
  
  if(beginning.once){
    if(this.verbose) console.log("[JSONg] starting section once, continue")
    this.state = 'continue'
    await this._continue()
  }
  // this._dispatchSectionChanged('0:0:0',null,beginning);
}


/**
 * Used to initiate the next section to advance to.
 * (*not applicable if player is stopped*)
 * @param breakout - if `breakout` is true, repeat rules do not apply, 
 * You may also breakout to any section if `breakout` is a `PlayerIndex` or advance to the next logical section automatically if nothing is provided
 * If forcing a different section and breaking up the natural progression, section repeat counter are not advanced
 * 
 * @returns `Promise` - fired when the player switches to the queued section*
 * 
 * Throws on cancellation, i.e. the `stop` or `cancel` command**/
public async continue(breakout: (boolean | PlayerIndex) = false): Promise<void>{
  //only schedule next section if in these states
  if(this.state !== 'playing') return
  await this._continue(breakout)
}


private async _continue(breakout: (boolean | PlayerIndex) = false): Promise<void>{

  if(!this._current) throw new Error("[JSONg] current section non-existent")

  const pos = getTransport().position.toString()
  const from = this._current
  const {next: nextIndex, increments} =  getNextSectionIndex(this._sections, this._current.index)!
  const nextSection = getNestedIndex(this._sections, Array.isArray(breakout) ? breakout : (breakout ? this._current.next : nextIndex)) as PlayerSection
  if(!nextSection) {
    throw new Error("[JSONg] no next section available")
  }   
  
  if(typeof breakout === 'boolean' && breakout){
    this._pending.section = getNestedIndex(this._sections, this._current.next)
    this._pending.increments = null
  }
  else{
    this._pending.section = nextSection
    this._pending.increments = increments
  }

  const nextTime =  quanTime(
    pos, 
    this._current.grain, 
    this._timingInfo?.meter, 
    this._sectionLastLaunchTime as string
  ) as BarsBeatsSixteenths

  // this._dispatchSectionQueue('0:0:0',this._current);
  if(this.verbose) console.log("[JSONg] advancing to next:",this._current.index, ">", nextSection.index)  

  if(this.state === 'playing') 
    this.state = 'queue'

  this.audioSafeCallback(()=>{
    this.dispatchEvent(new QueueEvent(nextSection,from))
  })

  try{
    await this._schedule(nextSection, nextTime)
  }
  catch(error){
    this.audioSafeCallback(()=>{
      this.dispatchEvent(new CancelQueueEvent(nextSection,from))
    })
    throw error
  }
  
  this.audioSafeCallback(()=>{
    this.dispatchEvent(new ChangeEvent(nextSection,from))
  })

  this._current = nextSection

  if(increments.length && !breakout){
    increments.forEach(ii => {
      const info = ii.length === 0 ? this._sections : (getIndexInfo(this._sections, ii) as PlayerSectionGroup)
      info.loopCurrent += 1

      this.audioSafeCallback(()=>{
        this.dispatchEvent(new RepeatEvent([info.loopCurrent,info.loopLimit],info))
      })

      if(info.loopCurrent >= info.loopLimit){
        info.loopCurrent = 0

        this.audioSafeCallback(()=>{
          this.dispatchEvent(new LoopEvent(info))
        })
      }
      setNestedIndex(info.loopCurrent, this._sections, [...ii,'loopCurrent'])
      if(this.verbose) console.log("[JSONg] group repeat counter increment", `${info.loopCurrent}/${info.loopLimit}`, ii,)
    })

  }

  this._clear()

  if(this._current.once) {
    this.state = 'continue'
    await this._continue()
  }
  else
  {
    const {next, increments} =  getNextSectionIndex(this._sections, this._current.index)!
    const nextSection = getNestedIndex(this._sections, next) as PlayerSection
    if(nextSection) {
      this._next = nextSection
      this._increments = increments
    }   
  }

  this.state = 'playing'
  if(this.verbose) console.log("[JSONg] continue resolved")
}







/**
 * This stop audio playback
 * (*not applicable if player is not already playing*)
 * 
 * This function also cancels any pending changes.
 * You may specify that the stop occur abruptly via `synced = false`, otherwise
 * the stop will wait the appropriate amount of time according to the current section directives.
 * 
 * @param synced - if false, stop is immediate
 * @returns `Promise` - resolved when the stop takes place*
 */
public async stop(synced: boolean = true)  : Promise<void>
{
  if(this.state === null) return
  if(this.state === 'stopped' || (synced && this.state === 'stopping') ) return

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
    if(this.verbose) console.log("[JSONg] stop cancelled")
    this._pending.actionRemainingBeats = 0
    this._pending.scheduledEvents.forEach(e => {
      getTransport().clear(e)
    })
    this.audioSafeCallback(()=>{
      this.dispatchEvent(new CancelQueueEvent(this._current,undefined))
    })

  }

  const doStop = (t: Time)=>{
    this.audioSafeCallback(()=>{
      this.dispatchEvent(new ChangeEvent(this._current,undefined))
    })
    signal.removeEventListener('abort',onCancelStop)
    this._stop(t)
    res()
  }

  if(synced){
    const next =  quanTime(
      getTransport().position.toString() as BarsBeatsSixteenths, 
      this._current.grain, 
      this._timingInfo?.meter,
      this._sectionLastLaunchTime as string
    ) as BarsBeatsSixteenths
    const when = ToneTime(next).toSeconds()
    
    this.audioSafeCallback(()=>{
      this.dispatchEvent(new QueueEvent(this._current,undefined))
    })

    signal.addEventListener('abort',onCancelStop)
    if(this.verbose) console.log("[JSONg] stopping at",next)
    this._pending.scheduledEvents.push(getTransport().scheduleOnce(doStop,next))
    this.state = 'stopping'
    this._pending.actionRemainingBeats = beatTransportDelta(getTransport().position.toString() as BarsBeatsSixteenths, next, this._timingInfo.meter)      
  }else {
    signal.addEventListener('abort',onCancelStop)
    doStop(toneNow())
    res()
  }
})
}


private _stop(t: Time){
  try{
    this._trackPlayers.forEach((p,i)=>{
          p.a.stop(t);
          p.b.stop(t);
          p.current = p.a
    })
  }catch(error){}

  getTransport().stop(t)
  getTransport().cancel()
  this.state = 'stopped'
  this._sectionLastLaunchTime = null
  this._sectionBeat = 0
  this._pending.actionRemainingBeats = 0
  this._pending.scheduledEvents = []
  this.audioSafeCallback(()=>{
    this.dispatchEvent(new ClickEvent([0, this._timingInfo.meter[0]]))
    this.dispatchEvent(new TransportEvent(
      [0, this._sectionLen],
      0
    ))
  })
  if(this.verbose) console.log("[JSONg] stopped")
}



//================Flow===========

/**
 * This function will cancel any pending changes that are queued up
 * */
public cancel(){
  this._abort()
  this._clear()
  this.state = 'playing'
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
  if(this._pending?.transportSchedule) getTransport().clear(this._pending.transportSchedule)
  this._pending.scheduledEvents.forEach(v => {
    getTransport().clear(v)
  })
  this._pending.scheduledEvents = []
  this._pending.transportSchedule = null
  this._pending.increments = null
  this._pending.section = null
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
          getTransport().clear(scheduleEvent)
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
          this._pending.actionRemainingBeats = beatTransportDelta(getTransport().position.toString() as BarsBeatsSixteenths, forWhen, this._timingInfo.meter)
          scheduleEvent = getTransport().scheduleOnce((t)=>{
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
            this._sectionLastLaunchTime = getTransport().position.toString() as BarsBeatsSixteenths;
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
          
          const progress = this._getSectionProgress(track) || 0

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
          const transitionForWhen = (ToneTime(getTransport().position).toSeconds() + dt)
         
          scheduleEvent = getTransport().scheduleOnce((t)=>{
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
      resolveAll()      
      // console.log("[schedule] END",toneNow())
    }).catch(()=>{
      //transition cancel, revert track fades
      rejectAll()
    })
  })

}





/**
 * 
Toggle the current metronome state or manually specify the metronome enable state
 * @param state optional explicit state
 */
public toggleMetronome(state?:boolean){
  this._timingInfo.metronome.enabled = state !== undefined ? state : !this._timingInfo.metronome.enabled ;
}

/**
 * @returns boolean whether the master output node is muted or not
 */
public isMute(){
  return this.output.volume.value >= -200;
}

/**
 * Explicitly mute the master `output` node with a 1 second fadeout
 */
public mute(){
  this.output.volume.linearRampToValueAtTime(-Infinity,'+1s');
}

/**
 * Explicitly unmute the master `output` node with a 1 second fadeout
 * 
 * @param [value=0] specify the db value to raise the volume to 
 */
public unmute(value:number = 0){
  this.output.volume.linearRampToValueAtTime(value,'+1s');
}







//========other===========
/**
 * Used to schedule synchronized callbacks that alter the DOM or which can cause audio glitches
 * @param callback callback is invoked at the correct time. 
 */
public audioSafeCallback(callback: ()=>void){
  getDraw().schedule(callback,toneNow());
}



}