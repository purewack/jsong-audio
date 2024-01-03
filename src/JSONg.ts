
import quanTime from './quantime'
import nextSection from './nextSection'
import buildSection from './buildSection'
import getLoopCount from './getLoopCount'
import {getNestedIndex} from './nestedIndex'
import Logger from './logger'
import { BarsBeatsSixteenths, Time as TimeUnit } from "tone/build/esm/core/type/Units"
import {
  now as toneNow,
  start as toneStart,
  Player, 
  ToneAudioBuffer, 
  Filter,
  Draw, 
  Synth, Transport, FilterRollOff, Destination, Time, ToneAudioBuffers,
} from 'tone';
import fetchSources from './JSONg.sources'
import fetchManifest, { isManifestValid } from './JSONg.manifest'

/* 
parser version 0.0.3
*/


export default class JSONg{

  //Debug related - logging extra messages
  private log = new Logger('warning');

  private _meta: JSONgMetadata | null = null;
  set meta(value: JSONgMetadata){
    this._meta = {...value};
  }
  get meta(): JSONgMetadata | null {
    return this._meta ? {...this._meta} : null;
  }


  //List of track involved with the song
  private tracksList: JSONgTrack[] = [];

  //Audio players and sources
  private trackPlayers:  {
    name: string;
    source: string;
    filter: Filter;
    volumeLimit: number;
    current: Player;
    a: Player;
    b: Player;
  }[] = []
  //Available real audio buffers
  private sourceBuffers: PlayerBuffers = {};

  
  //Available sections and their natural flow with extra loop counter for internal use
  private sectionsFlowMap: SectionType = {count: 0, loop: 0, loopLimit: Infinity, index: []};
  
  //Natural flow of named sections including loop counts
  private playbackFlow: FlowValue[] = [];

  //Song playback details like BPM
  private playbackInfo: JSONgPlaybackInfo = {bpm: 120, meter: [4,4]};
  
  //Looping details of each section, including specific directives
  private playbackMap: JSONgPlaybackMap = {};
  
  //Extraction of flow directives
  private getPlaybackMapOverrides(key: string): [JSONgPlaybackMapType, string[]] { 
    const k = key.split('-')
    return [this.playbackMap[k[0]] , k]
  }


  private _events = new EventTarget()

  public addEventListener = (type: string, listener: (...args:any)=>void)=>{
    this._events.addEventListener(type,listener);
  }
  public removeEventListener = (type: string, listener: (...args:any)=>void)=>{
    this._events.removeEventListener(type,listener);
  }

  //Event handlers
  private onSectionDidStart = (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[])=>{
    this._events.dispatchEvent(new CustomEvent('onSectionDidStart', {detail: {index, sectionOverrides}}))
  };
  private onSectionDidEnd   = (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[])=>{
    this._events.dispatchEvent(new CustomEvent('onSectionDidEnd', {detail: {index, sectionOverrides}}))
  };
  private onSectionWillStart = (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[], when: BarsBeatsSixteenths)=>{
    this._events.dispatchEvent(new CustomEvent('onSectionWillStart', {detail: {index, sectionOverrides, when}}))
  };
  private onSectionWillEnd   = (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[], when: BarsBeatsSixteenths)=>{
    this._events.dispatchEvent(new CustomEvent('onSectionWillEnd', {detail: {index, sectionOverrides, when}}))
  }; 
  private onSectionChange = (fromIndex: PlayerSectionIndex, toIndex: PlayerSectionIndex)=>{
    this._events.dispatchEvent(new CustomEvent('onSectionChange', {detail: {fromIndex, toIndex}}))
  };
  private onSectionCancelChange = ()=>{
    this._events.dispatchEvent(new Event('onSectionCancelChange'))
  };
  private onTransport = (position: BarsBeatsSixteenths, loopBeatPosition?: [number, number] )=>{
    this._events.dispatchEvent(new CustomEvent('onTransport', {detail: {position, loopBeatPosition}}))
  };
  private onStateChange = (state: PlayerPlaybackState)=>{
    this._events.dispatchEvent(new CustomEvent('onStateChange', {detail: state}))
  }
  private onSectionLoop = (loops: number, index: PlayerSectionIndex) => {
    this._events.dispatchEvent(new CustomEvent('onSectionLoop', {detail: {loops, index: [...index]}}))
  }
  // private onSectionOverrides?:    (index: PlayerSectionIndex, overrides: PlayerSectionOverrideFlags[])=>void;
  

  //State of the player and its property observer
  private _state:PlayerPlaybackState = null;
  set state(value: PlayerPlaybackState){
    this._state = value
    Draw.schedule(() => {
      this.onStateChange(value)
    }, toneNow());
  }
  get state(): PlayerPlaybackState{
    return this._state
  }

  //Currently playing now 
  private _playingNow: PlayerPlayingNow = {index: [], name: ''};
  get playingNow(): PlayerPlayingNow {
    return this._playingNow ? {...this._playingNow} : null;
  }
  private set playingNow(val: PlayerPlayingNow) {
    this._playingNow = val;
  } 

  //Transport and meter event handler
  private _metronome: Synth = new Synth().toDestination(); 
  private _meterBeat: number = 0
  private _sectionBeat: number = 0
  private _sectionLen: number = 0
  private _sectionLastLaunchTime?: BarsBeatsSixteenths = '0:0:0'
  private set meterBeat(v: number){
    this._meterBeat = v
    const nowIndex = [...this.sectionsFlowMap.index] as NestedIndex
    const nowSection = this.getPlaybackMapOverrides(getNestedIndex(this.sectionsFlowMap, nowIndex) as string)[0]
    const sectionLen = this._sectionLen
    const sectionBeat = this._sectionBeat = (this._sectionBeat+1) % this._sectionLen
    const pos = Transport.position as BarsBeatsSixteenths
    Draw.schedule(() => {
      if(nowSection){
        this.onTransport(pos, [sectionBeat,sectionLen])
      }
      else 
        this.onTransport(pos)
    }, toneNow());
  }
  get meterBeat(): number{
    return this._meterBeat
  }




  constructor(verbose: VerboseLevel = undefined){

    this._metronome.envelope.attack = 0;
    this._metronome.envelope.release = 0.05;
    
    this.log.level = verbose;
    this.log.info("[JSONg] New ", this);
    this.state = null;
  }

//==================Loader============


public async parse(file: string | JSONgManifestFile): Promise<void> {
  
  const [manifest,baseURL,filename] = await fetchManifest(file);

  if(!isManifestValid(manifest)) {
    return Promise.reject(new Error('[parse][manifest] invalid manifest'));
  }

  const manifestSourcePaths = fetchSourcePaths(manifest, baseURL);

  // begin parse after confirming that manifest is ok
  this.state = 'parsing';

  //transfer key information from manifest to player
  this.playingNow = null;
  this.meta = {...manifest.meta as JSONgMetadata};
  this.playbackInfo = {
    bpm: manifest.playback.bpm,
    meter: manifest.playback.meter,
    grain: manifest.playback?.grain || (manifest.playback.meter[0] / (manifest.playback.meter[1]/4)) || null,
    metronome: manifest.playback?.metronome || ["B5","G4"],
    metronomeDB: manifest.playback?.metronomeDB || -6,
  }
  this.tracksList = [...manifest.tracks]
  this.playbackFlow = [...manifest.playback.flow]
  this.playbackMap = {...manifest.playback.map}
  this.sectionsFlowMap = buildSection(this.playbackFlow)


  //meter, bpm and transport setup
  this._meterBeat = 0
  this._metronome.volume.value = this.playbackInfo.metronomeDB || 0;
  Transport.position = '0:0:0'
  Transport.bpm.value = this.playbackInfo.bpm
  Transport.timeSignature = this.playbackInfo.meter




  //spawn tracks
  this.trackPlayers = []
  this.log.info('[parse][tracks]',this.tracksList)
  for(const track of this.tracksList){
    const source = track.source ? track.source : track.name;
    const v = track?.volumeDB || 0

    const a = new Player()
    const b = new Player()
    a.volume.value = v
    b.volume.value = v

    const filter = new Filter(20000, "lowpass").toDestination()
    filter.set({'Q': track?.filter?.resonance 
        ? track.filter.resonance 
        : (this.playbackInfo?.filter?.resonance 
          ? this.playbackInfo?.filter?.resonance 
          : 1
      )}) 
    filter.set({'rolloff': (
      track?.filter?.rolloff 
        ? track.filter.rolloff 
        : (this.playbackInfo?.filter?.rolloff 
          ? this.playbackInfo?.filter?.rolloff 
          : -12
        )  
    ) as FilterRollOff})

    a.connect(filter)
    b.connect(filter)

    this.trackPlayers.push({
      name: track.name, source, a,b, current: a, filter, volumeLimit: v
    })
  }


  //Load media
  try{
    this.sourceBuffers = await fetchSources(manifestSourcePaths);
    
    this.stop(0);

    //assign buffers to players
    this.trackPlayers.forEach((track,i)=>{
      track.a.buffer = this.sourceBuffers[track.source] as ToneAudioBuffer
      track.b.buffer = track.a.buffer
    })
  }
  catch(error){
    this.state = null;
    this.log.error(new Error('[parse][sources] error fetching data'))
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
  this.log.info("[parse] end ",this)
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
    from: PlayerSectionIndex | null = null, 
    skip: (boolean | string) = false,
    fadein: TimeUnit = 0
  ) : Promise<PlayerSectionIndex> 
  {
    return new Promise((resolve, reject) => {
    if(this.state === 'stopping') {reject(); return;}
    
    if(this.state === 'stopped'){ 
      toneStart();
      
      if(getNestedIndex(this.sectionsFlowMap, from || [0]) === undefined) {reject(); return;}

      this.state = 'playing'
      this.sectionsFlowMap.index = from || [0]
      const overrides = this.getPlaybackMapOverrides(getNestedIndex(this.sectionsFlowMap, this.sectionsFlowMap.index))[1] as PlayerSectionOverrideFlags[]

      this._schedule(this.sectionsFlowMap.index, '0:0:0', ()=>{
        Draw.schedule(() => {
          this.trackPlayers.forEach((t,i)=>{
            const vol = this.tracksList[i]?.volumeDB || 0
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
          this.onSectionWillStart(this.sectionsFlowMap.index, overrides, '0:0:0')
        },toneNow())
      }, ()=>{
        resolve(this.sectionsFlowMap.index);
        Draw.schedule(() => {
          // this?.onSectionDidEnd?.([], [])
          this.onSectionDidStart(this.sectionsFlowMap.index, overrides)
          this._sectionLastLaunchTime = Transport.position as BarsBeatsSixteenths
        },toneNow())
        if(!fadein) return
        this.trackPlayers.forEach((t,i)=>{
          const vol = this.tracksList[i]?.volumeDB || 0
          this.rampTrackVolume(i, vol, fadein)
        })
      })

      this.meterBeat = 0
      this._sectionBeat = -1
      Transport.scheduleRepeat((t)=>{
        const note = this.playbackInfo?.metronome?.[this.meterBeat === 0 ? 0 : 1]
        if(!note) return
        this.meterBeat = (this.meterBeat + 1) % (Transport.timeSignature as number)
        if(this.playbackInfo.metronome && this.log.level){
          try{
            this._metronome.triggerAttackRelease(note,'64n',t);
          }
          catch(e){}
        }
      },'4n');
      Transport.position = '0:0:0'

      Transport.start()
      this.log.info("[play] player starting")  
    }
    else if(this.state === 'playing'){
      this.log.info("[play] player next", from)  
      this._advanceSection(from, skip, undefined, ()=>{
        resolve(from as PlayerSectionIndex)
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
      this.trackPlayers.forEach((p,i)=>{
        this.rampTrackVolume(i,-60, afterSec);
      })
      Draw.schedule(() => {
        this.onSectionWillStart([], [], Time(when).toBarsBeatsSixteenths()) 
        this.onSectionWillEnd([...this.sectionsFlowMap?.index], [], Time(when).toBarsBeatsSixteenths())  
      }, toneNow())
    }
    const stopping = (t: TimeUnit)=>{
      Transport.stop(t)
      Transport.cancel()
      this.trackPlayers.forEach((p,i)=>{
        try{
            p.a.stop(t);
            p.b.stop(t);
            p.current = p.a
        }catch(error){
          this.log.info('[stop] Empty track stopping ',this.tracksList[i]);
        }
      })
      Draw.schedule(() => {
        this.onSectionDidStart([], []) 
        this.onSectionDidEnd([...this.sectionsFlowMap.index], []) 
        this._sectionLastLaunchTime = undefined
      },toneNow()) 
      this.state = 'stopped'
      this.log.info("[stop] player stopped")
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

  public skipTo(index: PlayerSectionIndex, fade = '4n')  : void
  {
    this.play(index, true, fade);
  }
  
  public skipToOffGrid(index: PlayerSectionIndex) : void
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
      this.onSectionWillEnd([],[], when)
      this.onSectionWillStart([],[],when)
      this.onSectionCancelChange()
    }, toneNow())
  }














  private _advanceSection(index: PlayerSectionIndex | null, breakout: string | boolean = false, auto:boolean = false, onDone?: ()=>void){
    if(this._pending) this.cancel()
    
    const nowIndex = [...this.sectionsFlowMap.index] as number[]
    if(getNestedIndex(this.sectionsFlowMap, nowIndex) === undefined) return null;
    const [nowSection, nowOverrides] = this.getPlaybackMapOverrides(getNestedIndex(this.sectionsFlowMap, nowIndex))
  
    let _willNext = false;
    let nextOverrides: PlayerSectionOverrideFlags[]; 
    let nextIndex: PlayerSectionIndex;
    if(index !== null){
      nextIndex = index
      nextOverrides = []
    }else{
      nextSection(this.sectionsFlowMap, typeof breakout === 'boolean' ? breakout : false)
      nextIndex = [...this.sectionsFlowMap.index]
      nextOverrides = this.getPlaybackMapOverrides(getNestedIndex(this.sectionsFlowMap, nextIndex))[1] as PlayerSectionOverrideFlags[];
      _willNext = true;
    }
    
    this.sectionsFlowMap.index = nowIndex
    const regionGrainLength =  (nowSection.region[1] - nowSection.region[0]) * (Transport.timeSignature as number);
    const grain = auto ? regionGrainLength : nowSection?.grain
    const nextTime =  this._getNextTime(grain, !(typeof breakout === 'string' && breakout === 'offgrid'))

    this._schedule(nextIndex, nextTime, ()=>{
      if(_willNext){
        const loopIndex = [...nowIndex] as PlayerSectionIndex
        loopIndex[loopIndex.length-1] += 1
      }
      Draw.schedule(() => {
        const loops = getLoopCount(this.sectionsFlowMap, nowIndex)
        if(loops) this.onSectionLoop(loops, nowIndex)
        this.onSectionWillEnd([...nowIndex],[...nowOverrides] as PlayerSectionOverrideFlags[], nextTime)
        this.onSectionWillStart([...nextIndex],[...nextOverrides] as PlayerSectionOverrideFlags[], nextTime)
      }, toneNow());  
    }, ()=>{
      onDone?.()
      Draw.schedule(() => {
        this.onSectionChange([...nowIndex], [...nextIndex]);
        this.onSectionDidEnd([...nowIndex], [...nowOverrides] as PlayerSectionOverrideFlags[])
        this.onSectionDidStart([...nextIndex], [...nextOverrides] as PlayerSectionOverrideFlags[])
        this._sectionLastLaunchTime = Transport.position as BarsBeatsSixteenths
      }, toneNow());
    }) 
  }












  private _schedule(sectionIndex: PlayerSectionIndex, nextTime: BarsBeatsSixteenths, onPreScheduleCallback?: ()=>void, onScheduleCallback?: ()=>void){
    if(this._pending) return;
    const sectionID = getNestedIndex(this.sectionsFlowMap, sectionIndex)
    const [section, sectionFlags] = this.getPlaybackMapOverrides(sectionID)
    if(section === undefined){
      // if(this.verbose >= VerboseLevel.timed) console.warn("[schedule] non existent index");
      Draw.schedule(() => {
      //   this.onSectionWillEnd?.(null)
      //   this.onSectionWillStart?.(null)
        this.onSectionCancelChange()
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
      this.trackPlayers.forEach((track,i)=>{
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
      this.playingNow = {index:sectionIndex, name: sectionID};
      // if(this.verbose >= VerboseLevel.timed) console.log('[schedule] Playing now ',this.playingNow)
      onScheduleCallback?.()
      this.sectionsFlowMap.index = [...sectionIndex]
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
      this.tracksList?.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      })
      if(idx === null) {reject(); return; }
    }
    else if(typeof trackIndex === 'number'){
      idx = trackIndex
    }
    else return
    if(idx === null)  {reject(); return; }
    
    this.trackPlayers[idx].a.volume.linearRampTo(db,inTime, '@4n')
    this.trackPlayers[idx].b.volume.linearRampTo(db,inTime, '@4n')
    
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
      this.tracksList?.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      })
      if(idx === null) {reject(); return; }
    }
    else if(typeof trackIndex === 'number'){
      idx = trackIndex
    }
    else {reject(); return; }
    if(idx === null) {reject(); return; };

    this.trackPlayers[idx].filter.frequency.linearRampTo(100 + (percentage * 19900), inTime, '@4n')
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
    const _grain = grain || this.playbackInfo?.grain || this.playbackInfo?.meter?.[0];
    const nt = quanTime(Transport.position as BarsBeatsSixteenths, _grain, this.playbackInfo?.meter, alignGrid ? this._sectionLastLaunchTime : undefined)
    // if(this.#verbose) console.log('nexttime',nt,Transport.position, _grain, this.playbackInfo?.meter, this.#sectionLastLaunchTime)
    return nt
  }

}