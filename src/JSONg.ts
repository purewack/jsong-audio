import * as Tone from "tone";
import quanTime from './quantime'
import nextSection from './nextSection'
import buildSection from './buildSection'
import getLoopCount from './getLoopCount'
import {getNestedIndex} from './nestedIndex'
import { BarsBeatsSixteenths, Time } from "tone/build/esm/core/type/Units"
import { 
  FlowValue, 
  PlayerMetadata, 
  PlayerPlaybackInfo, 
  PlayerPlaybackMap, 
  PlayerPlaybackMapType, 
  PlayerPlaybackState, 
  PlayerPlayingNow, 
  PlayerSectionIndex, 
  PlayerSectionOverrideFlags, 
  PlayerSectionOverrides, 
  PlayerSourceMap, 
  PlayerTrack, 
  SectionType 
} from "./types"

/* 
parser version 0.0.3
*/
export default class JSONg {

  //Debug related - logging extra messages
  private _verbose = false;
  set verbose(state){
    this._verbose = state;
    if(state) console.log("JSONg player verbose mode");
  }
  get verbose(){
    return this._verbose;
  }

  private _meta: PlayerMetadata | null = null;
  set meta(value: PlayerMetadata){
    this._meta = {...value};
  }
  get meta(): PlayerMetadata | null {
    return this._meta ? {...this._meta} : null;
  }

  //Mapping of available audio buffers to tracks with use them
  private sourcesMap : PlayerSourceMap;
  
  //List of track involved with the song
  private tracksList: PlayerTrack[];
  
  //Available sections and their natural flow with extra loop counter for internal use
  private sectionsFlowMap: SectionType;
  
  //Natural flow of named sections including loop counts
  private playbackFlow: FlowValue[];

  //Song playback details like BPM
  private playbackInfo: PlayerPlaybackInfo;
  
  //Looping details of each section, including specific directives
  private playbackMap: PlayerPlaybackMap;
  
  //Extraction of flow directives
  private playbackMapOverrides(key: string): [PlayerPlaybackMapType, string[]] { 
    const k = key.split('-')
    return [this.playbackMap[k[0]] , k]
  }

  //Audio players and sources
  private trackPlayers:  {
    name: string;
    filter: Tone.Filter;
    volumeLimit: number;
    a: Tone.Player;
    b: Tone.Player;
    current: Tone.Player;
  }[]
  //Available real audio buffers
  private sourceBuffers: {
    [key: string]: Tone.ToneAudioBuffer
  };

  //Event handlers
  onStateChange?:         (state: PlayerPlaybackState)=>void;
  onSectionRepeat?:       (index: PlayerSectionIndex, loops: number)=>void;
  onSectionPlayStart?:    (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[])=>void;
  onSectionPlayEnd?:      (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[])=>void;
  onSectionWillStart?:    (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[], when?: string)=>void;
  onSectionWillEnd?:      (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[], when?: string)=>void;
  onSectionOverrides?:    (index: PlayerSectionIndex, overrides: PlayerSectionOverrideFlags[])=>void;
  onSectionCancelChange?: ()=>void;
  onTransport?: (position: BarsBeatsSixteenths, loopBeatPosition?: [number, number] )=>void;
  
  //State of the player and its property observer
  private _state:PlayerPlaybackState = null;
  set state(value: PlayerPlaybackState){
    this._state = value
    Tone.Draw.schedule(() => {
      this.onStateChange?.(value)
    }, Tone.now());
  }
  get state(): PlayerPlaybackState{
    return this._state
  }

  //Currently playing now 
  private _playingNow: PlayerPlayingNow;
  get playingNow(): PlayerPlayingNow {
    return this._playingNow ? {...this._playingNow} : null;
  }
  private set playingNow(val: PlayerPlayingNow) {
    this._playingNow = val;
  } 

  //Transport and meter event handler
  private _metronome: Tone.Synth; 
  private _meterBeat: number = 0
  private _sectionBeat: number = 0
  private _sectionLen: number = 0
  private _sectionLastLaunchTime?: BarsBeatsSixteenths = '0:0:0'
  private set meterBeat(v: number){
    this._meterBeat = v
    Tone.Draw.schedule(() => {
      const nowIndex = [...this.sectionsFlowMap.index]
      const nowSection = this.playbackMapOverrides(getNestedIndex(this.sectionsFlowMap, nowIndex))[0]
      if(nowSection){
        this._sectionBeat = (this._sectionBeat+1) % this._sectionLen
        this.onTransport?.(Tone.Transport.position as BarsBeatsSixteenths, [this._sectionBeat,this._sectionLen])
      }
      else 
        this.onTransport?.(Tone.Transport.position as BarsBeatsSixteenths)
    }, Tone.now());
  }
  get meterBeat(): number{
    return this._meterBeat
  }

//==================Loader==============
private _loadStatus:  {
  required: number, 
  loaded: number, 
  failed: number
};

//Load a .jsong file with all appropriate audio data related, ready for playback, assumed sound data is in the same dir as .jsong
public parse(folderPath: string): Promise<string>;

//Load a .jsong file with all appropriate audio data related, ready for playback, with an optional directory pointing to where the sound data is
public parse(manifestPath: string, dataPath: string): Promise<string>;

public parse(manifestPath: string, dataPath?: string): Promise<string> {
  if(!dataPath){
    const sep = (manifestPath.endsWith('/')  ? ' ' : '/')
    const _loadpath = manifestPath + sep;
    if(this.verbose) console.log('Loading from path',_loadpath)
    return this.parse(_loadpath + 'audio.jsong', _loadpath);
  }

  return new Promise((resolve: (reason: string) =>void, reject: (reason: string, detail?: any)=>void)=>{
  
  fetch(manifestPath).then(resp => {
    
    resp.text().then(txt => {
   
    let data: any;
    try {
    data = JSON.parse(txt)
    }
    catch(error){
      if(this.verbose) console.error('JSONg Parse error')
      reject('JSON parse', error)
      return
    }

    // if(this.verbose) console.log('JSONg loaded',data)
    if(data?.type !== 'jsong') {
      if(this.verbose) console.error('Invalid manifest file reject')
      reject('manifest','Invalid manifest file')
      return
    }

    this._metronome = new Tone.Synth().toDestination()
    this._metronome.envelope.attack = 0;
    this._metronome.envelope.release = 0.05;

    this.meta = {...data.meta} as PlayerMetadata;

    this.playbackInfo = {
      bpm: data.playback.bpm,
      meter: data.playback.meter,
      totalMeasures: data.playback.totalMeasures,
      grain: data.playback?.grain || (data.playback.meter[0] / (data.playback.meter[1]/4)) || null,
      metronome: data.playback?.metronome || ["B5","G4"],
      metronomeDB: data.playback?.metronomeDB || -6,
    }
    this.tracksList = [...data.tracks]
    this.playbackFlow = [...data.playback.flow]
    this.playbackMap = {...data.playback.map}
    this.sectionsFlowMap = buildSection(this.playbackFlow)
    this.sourcesMap = {...data.sources}
    const src_keys = Object.keys(this.sourcesMap)
    if(this.verbose) console.log('Song flow map', JSON.stringify(this.playbackFlow), this.sectionsFlowMap)
    
    this._meterBeat = 0
    Tone.Transport.position = '0:0:0'
    this._metronome.volume.value = this.playbackInfo.metronomeDB || 0;
    
    Tone.Transport.bpm.value = this.playbackInfo.bpm
    Tone.Transport.timeSignature = this.playbackInfo.meter

    this.playingNow = null;

    if(this.trackPlayers){
      this.stop(0)
      this.state = null; 
    }

    this._loadStatus = {
      required: this.tracksList.length, 
      loaded: 0, 
      failed: 0
    };

    if(this.sourceBuffers){
      Tone.Transport.cancel()
      this.trackPlayers.forEach((t)=>{
        t.a.dispose()
        t.b.dispose()
      })
      Object.keys(this.sourceBuffers).forEach((k)=>{
        this.sourceBuffers[k].dispose()
      })
      if(this.verbose) console.log('Audio reset')
    }

    const spawnTracks = ()=>{
      this.trackPlayers = []
      for(const track of this.tracksList){
        const name = track.source ? track.source : track.name;
        const v = track?.volumeDB || 0
        const buf = this.sourceBuffers[name]

        const a = new Tone.Player()
        a.volume.value = v
        a.buffer = buf

        const b = new Tone.Player()
        b.volume.value = v
        b.buffer = buf

        const filter = new Tone.Filter(20000, "lowpass").toDestination()
        if(track?.filter?.resonance) filter.set({'Q':track.filter.resonance}) 
        if(track?.filter?.rolloff) filter.set({'rolloff': track.filter.rolloff as Tone.FilterRollOff})
        else filter.rolloff = -24;
        a.connect(filter)
        b.connect(filter)

        this.trackPlayers.push({
          name, a,b, current: a, filter, volumeLimit: v
        })
      }
    }

    const checkLoad = ()=>{
      if(this._loadStatus.loaded+this._loadStatus.failed === this._loadStatus.required) {
        this.state = 'stopped'
        //full load
        if(this.verbose) console.log('Loading sequence done', this._loadStatus); 
        if(this._loadStatus.loaded === this._loadStatus.required){
          resolve('loading_full')
          spawnTracks()
        }
        //partial load
        else if(this._loadStatus.loaded && this._loadStatus.loaded < this._loadStatus.required){
          resolve('loading_partial')
          spawnTracks()
        }
        //failed load
        else{
          reject('loading_fail')
          this.state = null;
        }
      }
    }

    this.sourceBuffers = {} 

    Tone.ToneAudioBuffer.baseUrl = window.location.origin
    for(const src_id of src_keys){
      const data = this.sourcesMap[src_id]
      const buffer = new Tone.ToneAudioBuffer();
      // if(this.verbose) console.log('Current source id', src_id)
      const _dataPath = dataPath ? dataPath : manifestPath
      const url = data.startsWith('data') ? data : _dataPath + (data.startsWith('./') ? data.substring(1) : ('/' + data))
      buffer.load(url).then((tonebuffer)=>{
        this._loadStatus.loaded++;
        this.sourceBuffers[src_id] = tonebuffer
        checkLoad()
        if(this.verbose) console.log('Source loaded ', src_id, tonebuffer)
      }).catch((e)=>{
        this._loadStatus.failed++;
        checkLoad()
        console.error('Failed loading source ', src_id, data, ' ', e)
      })
    }

    if(this.verbose) {
      console.log("Parsed song ",this)
      console.log("meter ",Tone.Transport.timeSignature, this.playbackInfo)
    }
    })
  })

  })

}
  
//================Controls===========

//Main method used to play a song and continue interaction after initial playback,
//You may play [from] any section or from the beginning,
//if [skip] if is provided then the flow section rules do not apply,
//an optional [fadein] time may be provided which takes effect only during a start from a stopped state.
//After the first call from stopped state, the player is put into a playing state.

  public play(
    from: PlayerSectionIndex | null = null, 
    skip: (boolean | string) = false,
    fadein: Time = 0
  ) : void 
  {
    console.log('play', from, skip, fadein, this.state);

    if(this.state === 'stopping') return;
    
    if(this.state === 'stopped'){ 
      Tone.start();
      
      if(getNestedIndex(this.sectionsFlowMap, from || [0]) === undefined) return;
      this.sectionsFlowMap.index = from || [0]
      const overrides = this.playbackMapOverrides(getNestedIndex(this.sectionsFlowMap, this.sectionsFlowMap.index))[1] as PlayerSectionOverrideFlags[]

      this._schedule(this.sectionsFlowMap.index, '0:0:0', ()=>{
        Tone.Draw.schedule(() => {
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
          this?.onSectionWillEnd?.([], [])
          this?.onSectionWillStart?.([...this.sectionsFlowMap.index], [...overrides])
        },Tone.now())
      }, ()=>{
        Tone.Draw.schedule(() => {
          this?.onSectionPlayEnd?.([], [])
          this?.onSectionPlayStart?.([...this.sectionsFlowMap.index], [...overrides])
          this._sectionLastLaunchTime = Tone.Transport.position as BarsBeatsSixteenths
          this.state = 'playing'
        },Tone.now())
        if(!fadein) return
        this.trackPlayers.forEach((t,i)=>{
          const vol = this.tracksList[i]?.volumeDB || 0
          this.rampTrackVolume(i, vol, fadein)
        })
      })

      this.meterBeat = 0
      this._sectionBeat = -1
      Tone.Transport.position = '0:0:0'
      Tone.Transport.scheduleRepeat((t)=>{
        const note = this.playbackInfo?.metronome?.[this.meterBeat === 0 ? 0 : 1]
        if(!note) return
        this.meterBeat = (this.meterBeat + 1) % (Tone.Transport.timeSignature as number)
        if(this.playbackInfo.metronome && this.verbose)
          this._metronome.triggerAttackRelease(note,'64n',t);
      },'4n');

      Tone.Transport.start('+0.1s')
    }
    else if(this.state === 'playing'){
      this._advanceSection(from, skip)
    }
  }

  public stop(after: Time = '4n', fadeout: boolean = true)  : void 
  {
    if(this.state === 'stopped' || this.state === 'stopping') return
    this.state = !after ? 'stopped' : 'stopping';
    const afterSec = Tone.Time(after).toSeconds()
    const when = after ? afterSec + (Tone.Time(Tone.Transport.position)).toSeconds()
    : Tone.now();
    
    if(fadeout && after){
      this.trackPlayers.forEach((p,i)=>{
        this.rampTrackVolume(i,-60, afterSec);
      })
      Tone.Draw.schedule(() => {
        this?.onSectionWillStart?.([], []) 
        this?.onSectionWillEnd?.([...this.sectionsFlowMap?.index], [])  
      }, Tone.now())
    }
    const stopping = (t: Time)=>{
      Tone.Transport.stop(t)
      Tone.Transport.cancel()
      this.trackPlayers.forEach((p,i)=>{
        try{
            p.a.stop(t);
            p.b.stop(t);
            p.current = p.a
        }catch(error){
          if(this.verbose) console.log('Empty track stopping ',this.tracksList[i]);
        }
      })
      Tone.Draw.schedule(() => {
        this?.onSectionPlayStart?.([], []) 
        this?.onSectionPlayEnd?.([...this.sectionsFlowMap.index], []) 
        this._sectionLastLaunchTime = undefined
      },Tone.now()) 
      this.state = 'stopped'
    }
    if(after)
      Tone.Transport.scheduleOnce(stopping,when)
    else 
      stopping(when)

    if(this.verbose) console.log("JSONg player stopped")
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
  private _pending: null | {id: null | number, when: BarsBeatsSixteenths};

  //This function will cancel any pending changes that are queued up
  public cancel(){
    if(!this._pending) return
    if(this._pending?.id) Tone.Transport.clear(this._pending.id)
    this._pending = null
    
    Tone.Draw.schedule(() => {
      this.onSectionWillEnd?.([],[])
      this.onSectionWillStart?.([],[])
      this.onSectionCancelChange?.()
    }, Tone.now())
  }

  private _advanceSection(index: PlayerSectionIndex | null, breakout: string | boolean = false, auto:boolean = false){
    if(this._pending) this.cancel()
    
    const nowIndex = [...this.sectionsFlowMap.index] as number[]
    if(getNestedIndex(this.sectionsFlowMap, nowIndex) === undefined) return null;
    const [nowSection, nowOverrides] = this.playbackMapOverrides(getNestedIndex(this.sectionsFlowMap, nowIndex))
   
    let _willNext = false;
    let nextOverrides: PlayerSectionOverrideFlags[]; 
    let nextIndex: PlayerSectionIndex;
    if(index)
      nextIndex = index
    else{
      nextSection(this.sectionsFlowMap, typeof breakout === 'boolean' ? breakout : false)
      nextIndex = [...this.sectionsFlowMap.index]
      nextOverrides = this.playbackMapOverrides(getNestedIndex(this.sectionsFlowMap, nowIndex))[1] as PlayerSectionOverrideFlags[];
      _willNext = true;
    }
    
    this.sectionsFlowMap.index = nowIndex
    const regionGrainLength =  (nowSection.region[1] - nowSection.region[0]) * (Tone.Transport.timeSignature as number);
    const grain = auto ? regionGrainLength : nowSection?.grain
    const nextTime =  this._getNextTime(grain, !(typeof breakout === 'string' && breakout === 'offgrid'))

    this._schedule(nextIndex, nextTime, ()=>{
      Tone.Draw.schedule(() => {
        if(_willNext){
          const loopIndex = [...nowIndex] as PlayerSectionIndex
          loopIndex[loopIndex.length-1] += 1
          const loops = getLoopCount(this.sectionsFlowMap, nowIndex)
          if(loops) this.onSectionRepeat?.([...nowIndex], loops)
        }
        this.onSectionWillEnd?.([...nowIndex],[...nowOverrides] as PlayerSectionOverrideFlags[], nextTime)
        this.onSectionWillStart?.([...nextIndex],[...nextOverrides] as PlayerSectionOverrideFlags[], nextTime)
      }, Tone.now());  
    }, ()=>{
      Tone.Draw.schedule(() => {
        this.onSectionPlayEnd?.([...nowIndex], [...nowOverrides] as PlayerSectionOverrideFlags[])
        this.onSectionPlayStart?.([...nextIndex], [...nextOverrides] as PlayerSectionOverrideFlags[])
        this._sectionLastLaunchTime = Tone.Transport.position as BarsBeatsSixteenths
      }, Tone.now());
    }) 
  }

  private _schedule(sectionIndex: PlayerSectionIndex, nextTime: BarsBeatsSixteenths, onPreScheduleCallback?: ()=>void, onScheduleCallback?: ()=>void){
    if(this._pending) return;
    const sectionID = getNestedIndex(this.sectionsFlowMap, sectionIndex)
    const [section, sectionFlags] = this.playbackMapOverrides(sectionID)
    if(section === undefined){
      if(this.verbose) console.log("Can't schedule non existent index");
      Tone.Draw.schedule(() => {
      //   this.onSectionWillEnd?.(null)
      //   this.onSectionWillStart?.(null)
        this.onSectionCancelChange?.()
      }, Tone.now())
      return;
    }

    onPreScheduleCallback?.();

    let sectionOverrides: PlayerSectionOverrides = {}
    sectionFlags.forEach((value: string) =>{
      const f = value as PlayerSectionOverrideFlags
      if(f === '>') sectionOverrides = {...sectionOverrides, autoNext: true}
      if(f === 'X' || f === 'x') sectionOverrides = {...sectionOverrides, legato: true}
    })
    if(this.verbose) console.log('Section overrides', sectionOverrides)
    this.onSectionOverrides?.([...sectionIndex],[...sectionFlags as PlayerSectionOverrideFlags[]])

    if(this.verbose) console.log('Next schedule to happen at: ', nextTime);
    
    this._pending = {id: null, when: nextTime}
    this._pending.id = Tone.Transport.scheduleOnce((t: number)=>{
      if(this.verbose) console.log('Schedule done for time: ', nextTime, t)
      this.trackPlayers.forEach((track,i)=>{
        const nextTrack = track.current === track.a ? track.b : track.a

        nextTrack.loopStart = section.region[0]+'m';
        nextTrack.loopEnd = section.region[1]+'m';
        nextTrack.loop = true;
        try{
          const nonLegatoStart = ()=>{
            if(this.verbose) console.log('non legato section', sectionIndex, track.name)
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
              
              if(this.verbose) console.log('legato track xfade', track.name)
          }

          if(sectionOverrides?.legato){
            if(this.verbose) console.log('legato section', sectionIndex)
            let legatoDT: number;
            let legatoTracks: string[] | undefined;
            if(typeof section?.legato === 'object'){
              legatoDT = Tone.Time((section?.legato?.duration || 4) + 'n').toSeconds()
              legatoTracks = section.legato?.xfades
            }
            else
              legatoDT = Tone.Time((section?.legato || 4) + 'n').toSeconds()
            
            if(this.verbose) console.log('legato', t, legatoDT)
            
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
          if(this.verbose) console.log('Empty track playing ',this.tracksList[i], error);
        }
      })
      this.playingNow = {index:sectionIndex, name: sectionID};
      if(this.verbose) console.log('Playing now',this.playingNow)
      onScheduleCallback?.()
      this.sectionsFlowMap.index = [...sectionIndex]
      this._sectionBeat = -1
      this._sectionLen = (section.region[1] - section.region[0]) * (Tone.Transport.timeSignature as number)
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
  public rampTrackVolume(trackIndex: string | number, db: number, inTime: BarsBeatsSixteenths | Time = 0, sync: boolean = true){
    if(!this.state) return
    let idx: number | null = null;
    if(typeof trackIndex === 'string'){
      this.tracksList?.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      })
      if(idx === null) return
    }
    else if(typeof trackIndex === 'number'){
      idx = trackIndex
    }
    else return
    if(idx === null) return;
    
    this.trackPlayers[idx].a.volume.linearRampTo(db,inTime, sync ? '@4n' : undefined)
    this.trackPlayers[idx].b.volume.linearRampTo(db,inTime, sync ? '@4n' : undefined)
  }
  public rampTrackFilter(trackIndex: string | number, percentage: number, inTime: BarsBeatsSixteenths | Time = 0, sync: boolean = true){
    if(!this.state) return
    let idx: number | null = null;
    if(typeof trackIndex === 'string'){
      this.tracksList?.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      })
      if(idx === null) return
    }
    else if(typeof trackIndex === 'number'){
      idx = trackIndex
    }
    else return
    if(idx === null) return;

    this.trackPlayers[idx].filter.frequency.linearRampTo(100 + (percentage * 19900), inTime, sync ? '@4n' : undefined)
  }
  public crossFadeTracks(outIndexes: (string | number)[], inIndexes: (string | number)[], inTime: BarsBeatsSixteenths | Time = '1m', sync: boolean = true){
    inIndexes?.forEach(i=>{
      this.rampTrackVolume(i, 0,inTime,sync)
    })
    if(!this.state) return
    outIndexes?.forEach(i=>{
      this.rampTrackVolume(i,-50,inTime,sync)
    }) 
  }

//================Various==========
  private _getNextTime(grain?: number, alignGrid: boolean = true){
    const _grain = grain || this.playbackInfo?.grain || this.playbackInfo?.meter?.[0];
    const nt = quanTime(Tone.Transport.position as BarsBeatsSixteenths, _grain, this.playbackInfo?.meter, alignGrid ? this._sectionLastLaunchTime : undefined)
    // if(this.#verbose) console.log('nexttime',nt,Tone.Transport.position, _grain, this.playbackInfo?.meter, this.#sectionLastLaunchTime)
    return nt
  }

  constructor(verbose:boolean = false){
    this.verbose = verbose
    if(this.verbose) console.log("New", this);
    this.state = null;
  }
}