import Tone, { FilterRollOff } from "tone"
import quanTime from './quantime'
import nextSection from './nextSection'
import buildSection from './buildSection'
import getLoopCount from './getLoopCount'
import {getNestedIndex} from './nestedIndex'
import { BarsBeatsSixteenths, Time } from "tone/build/esm/core/type/Units"
import { 
  FlowValue, 
  NestedIndex, 
  PlayerPlaybackInfo, 
  PlayerPlaybackMap, 
  PlayerPlaybackState, 
  PlayerSectionChangeHandler, 
  PlayerSectionIndex, 
  PlayerSectionOverrideFlags, 
  PlayerSectionOverrides, 
  PlayerSectionRepeatHandler, 
  PlayerSourceMap, 
  PlayerTrack, 
  SectionType 
} from "./types"

class JSONg {
  //parser version 0.0.2

  #sourcesMap : PlayerSourceMap;
  #tracksList: PlayerTrack[];
  #sectionsFlowMap: SectionType;
  #playbackFlow: FlowValue[];
  #playbackInfo: PlayerPlaybackInfo;
  #playbackMap: PlayerPlaybackMap;

  playbackMap(key){ 
    const k = key.split('-')
    return [this.#playbackMap[k[0]] , k]
  }

  // audio players and sources
  #trackPlayers:  {
    name: string;
    filter: Tone.Filter;
    volumeLimit: number;
    a: Tone.Player;
    b: Tone.Player;
    current: Tone.Player;
  }[]
  #sourceBuffers: {
    [key: string]: Tone.ToneAudioBuffer
  };

  onSectionPlayStart?: PlayerSectionChangeHandler;
  onSectionPlayEnd?: PlayerSectionChangeHandler;
  onSectionWillStart?: PlayerSectionChangeHandler;
  onSectionWillEnd?: PlayerSectionChangeHandler;
  onSectionRepeat?: PlayerSectionRepeatHandler;

  onStateChange: (value: PlayerPlaybackState)=>void;
  #state:PlayerPlaybackState = null;
  set state(value: PlayerPlaybackState){
    this.#state = value
    Tone.Draw.schedule(() => {
      this.onStateChange?.(value)
    }, Tone.now());
  }
  get state(): PlayerPlaybackState{
    return this.#state
  }

  playingNow: {index: PlayerSectionIndex, name: string} | null;

  //transport and meter
  onTransport?: (position: BarsBeatsSixteenths, loopPosition?:  number, loopBeatPosition?: [number, number] )=>void;
  #metronome: Tone.Synth; 
  #meterBeat: number = 0
  #sectionBeat: number = 0
  #sectionLen: number = 0
  #sectionLastLaunchTime?: BarsBeatsSixteenths = '0:0:0'
  set meterBeat(v: number){
    this.#meterBeat = v
    Tone.Draw.schedule(() => {
      const nowIndex = [...this.#sectionsFlowMap.index]
      const nowSection = this.playbackMap(getNestedIndex(this.#sectionsFlowMap, nowIndex))[0]
      if(nowSection){
        this.#sectionBeat = (this.#sectionBeat+1) % this.#sectionLen
        this.onTransport?.(Tone.Transport.position as BarsBeatsSixteenths, Tone.Transport.progress, [this.#sectionBeat,this.#sectionLen])
      }
      else 
        this.onTransport?.(Tone.Transport.position as BarsBeatsSixteenths)
    }, Tone.now());
  }
  get meterBeat(): number{
    return this.#meterBeat
  }

//==================Loader==============
#load:  {
  required: number, 
  loaded: number, 
  failed: number
};

parse(folderPath: string): Promise<string>;
parse(manifestPath: string, dataPath: string): Promise<string>;

parse(manifestPath: string, dataPath?: string): Promise<string> {
  if(!dataPath){
    const sep = (manifestPath.endsWith('/')  ? ' ' : '/')
    const _loadpath = manifestPath + sep;
    if(this.verbose) console.log('Loading from path',_loadpath)
    return this.parse(_loadpath + 'audio.jsong', _loadpath);
  }

  return new Promise((resolve: (reason: string, detail?: string)=>void, reject: (reason: string, detail?: string)=>void)=>{
  
  fetch(manifestPath).then(resp => {
    resp.text().then(txt => {
      // console.log(txt)
    const data = JSON.parse(txt)
        
    if(this.verbose) console.log('JSONg loaded',data)
    if(data?.type !== 'jsong') {
      reject('manifest','Invalid manifest file')
      return
    }


    this.#playbackInfo = {
      bpm: data.playback.bpm,
      meter: data.playback.meter,
      totalMeasures: data.playback.totalMeasures,
      grain: data.playback?.grain || (data.playback.meter[0] / (data.playback.meter[1]/4)) || null,
      metronome: data.playback?.metronome || ["B5","G4"],
      metronomeDB: data.playback?.metronomeDB || -6,
    }
    this.#tracksList = [...data.tracks]
    this.#playbackFlow = [...data.playback.flow]
    this.#playbackMap = {...data.playback.map}
    this.#sectionsFlowMap = buildSection(this.#playbackFlow)
    this.#sourcesMap = {...data.sources}
    const src_keys = Object.keys(this.#sourcesMap)
    if(this.verbose) console.log('Song flow map', JSON.stringify(this.#playbackFlow), this.#sectionsFlowMap)
    

    this.#load = {
      required: this.#tracksList.length, 
      loaded: 0, 
      failed: 0
    };

    if(this.#trackPlayers){
      this.stop(0)
      this.state = null; 
    }

    if(this.#sourceBuffers){
      Tone.Transport.cancel()
      this.#trackPlayers.forEach((t)=>{
        t.a.dispose()
        t.b.dispose()
      })
      Object.keys(this.#sourceBuffers).forEach((k)=>{
        this.#sourceBuffers[k].dispose()
      })
      if(this.verbose) console.log('Audio reset')
    }

    const spawnTracks = ()=>{
      this.#trackPlayers = []
      for(const track of this.#tracksList){
        const name = track.source ? track.source : track.name;
        const v = track?.volumeDB || 0
        const buf = this.#sourceBuffers[name]

        const a = new Tone.Player()
        a.volume.value = v
        a.buffer = buf

        const b = new Tone.Player()
        b.volume.value = v
        b.buffer = buf

        const filter = new Tone.Filter(20000, "lowpass").toDestination()
        if(track?.filter?.resonance) filter.set({'Q':track.filter.resonance}) 
        if(track?.filter?.rolloff) filter.set({'rolloff': track.filter.rolloff as FilterRollOff})
        else filter.rolloff = -24;
        a.connect(filter)
        b.connect(filter)

        this.#trackPlayers.push({
          name, a,b, current: a, filter, volumeLimit: v
        })
      }
    }

    const checkLoad = ()=>{
      if(this.#load.loaded+this.#load.failed === this.#load.required) {
        this.state = 'stopped'
        //full load
        if(this.verbose) console.log('Loading sequence done', this.#load); 
        if(this.#load.loaded === this.#load.required){
          resolve('loading', 'full')
          spawnTracks()
        }
        //partial load
        else if(this.#load.loaded && this.#load.loaded < this.#load.required){
          resolve('loading','partial')
          spawnTracks()
        }
        //failed load
        else{
          reject('loading')
          this.state = null;
        }
      }
    }

    this.#sourceBuffers = {} 

    Tone.ToneAudioBuffer.baseUrl = window.location.origin
    for(const src_id of src_keys){
      const data = this.#sourcesMap[src_id]
      const buffer = new Tone.ToneAudioBuffer();
      // if(this.verbose) console.log('Current source id', src_id)
      const _dataPath = dataPath ? dataPath : manifestPath
      const url = data.startsWith('data') ? data : _dataPath + (data.startsWith('./') ? data.substring(1) : ('/' + data))
      buffer.load(url).then((tonebuffer)=>{
        this.#load.loaded++;
        this.#sourceBuffers[src_id] = tonebuffer
        checkLoad()
        if(this.verbose) console.log('Source loaded ', src_id, tonebuffer)
      }).catch((e)=>{
        this.#load.failed++;
        checkLoad()
        console.log('Failed loading source ', src_id, data, ' ', e)
      })
    }

    this.#meterBeat = 0
    Tone.Transport.position = '0:0:0'
    this.#metronome.volume.value = this.#playbackInfo.metronomeDB || 0;
    
    Tone.Transport.bpm.value = this.#playbackInfo.bpm
    Tone.Transport.timeSignature = this.#playbackInfo.meter

    this.playingNow = null;

    if(this.verbose) {
      console.log("Parsed song ",this)
      console.log("meter ",Tone.Transport.timeSignature, this.#playbackInfo)
    }
    })
  })

  })

}

  
//================Controls===========
  play(from = null, skip = false, fadein = '1m'){

    if(this.state === 'stopping') return;
    
    if(this.state === 'stopped'){    
      Tone.start()
      this.#trackPlayers.forEach((t,i)=>{
        const vol = this.#tracksList[i]?.volumeDB || 0
        if(fadein){
          t.a.volume.value = -60;
          t.b.volume.value = -60;
        }
        else{
          t.a.volume.value = vol
          t.b.volume.value = vol
        }
      })

      Tone.Transport.cancel()
      this.#sectionsFlowMap.index = from || [0]
      if(getNestedIndex(this.#sectionsFlowMap, this.#sectionsFlowMap.index) === undefined) return null;

      Tone.Draw.schedule(() => {
        this?.onSectionWillEnd?.(null)
        this?.onSectionWillStart?.(this.#sectionsFlowMap.index)
      },Tone.now())

      this.schedule(this.#sectionsFlowMap.index, '0:0:0', ()=>{
        Tone.Draw.schedule(() => {
          this?.onSectionPlayEnd?.(null)
          this?.onSectionPlayStart?.(this.#sectionsFlowMap.index)
          this.#sectionLastLaunchTime = Tone.Transport.position as BarsBeatsSixteenths
        },Tone.now())
        if(!fadein) return
        this.#trackPlayers.forEach((t,i)=>{
          const vol = this.#tracksList[i]?.volumeDB || 0
          this.rampTrackVolume(i, vol, fadein)
        })
      })

      this.meterBeat = 0
      this.#sectionBeat = -1
      Tone.Transport.position = '0:0:0'
      Tone.Transport.scheduleRepeat((t)=>{
        const note = this.#playbackInfo?.metronome?.[this.meterBeat === 0 ? 0 : 1]
        if(!note) return
        this.meterBeat = (this.meterBeat + 1) % (Tone.Transport.timeSignature as number)
        if(this.#playbackInfo.metronome || this.verbose)
          this.#metronome.triggerAttackRelease(note,'64n',t);
      },'4n');

      Tone.Transport.start('+0.1s')
      this.state = 'started'
    }
    else if(this.state === 'started'){
      this.advanceSection(skip)
    }
  }

  stop(after: Time = '4n', fadeout: boolean = true){
    if(this.state === 'stopped' || this.state === 'stopping') return
    this.state = !after ? 'stopped' : 'stopping';
    const afterSec = Tone.Time(after).toSeconds()
    const when = after ? afterSec + (Tone.Time(Tone.Transport.position)).toSeconds()
    : Tone.now();
    
    if(fadeout && after){
      this.#trackPlayers.forEach((p,i)=>{
        this.rampTrackVolume(i,-60, afterSec);
      })
      Tone.Draw.schedule(() => {
        this?.onSectionWillStart?.(null) 
        this?.onSectionWillEnd?.(this.#sectionsFlowMap?.index)  
      }, Tone.now())
    }
    const stopping = (t)=>{
      Tone.Transport.stop(t)
      Tone.Transport.cancel()
      this.#trackPlayers.forEach((p,i)=>{
        try{
            p.a.stop(t);
            p.b.stop(t);
            p.current = p.a
        }catch(error){
          if(this.verbose) console.log('Empty track stopping ',this.#tracksList[i]);
        }
      })
      Tone.Draw.schedule(() => {
        this?.onSectionPlayStart?.(null) 
        this?.onSectionPlayEnd?.(this.#sectionsFlowMap.index) 
        this.#sectionLastLaunchTime = undefined
      },Tone.now()) 
      this.state = 'stopped'
    }
    if(after)
      Tone.Transport.scheduleOnce(stopping,when)
    else 
      stopping(when)

    if(this.verbose) console.log("JSONg player stopped")
  }

  next(){
    if(this.state === 'playing')
    this.play(null, false)
  }

  skip(){
    if(this.state === 'playing')
    this.play(null, true)
  }


//================Flow===========
  #pending: null | {id: null | number, when: BarsBeatsSixteenths};

  advanceSection(breakout: PlayerSectionIndex | boolean = false, auto:boolean = false){
    if(this.#pending) this.cancel()
    
    const nowIndex = [...this.#sectionsFlowMap.index] as number[]
    if(getNestedIndex(this.#sectionsFlowMap, nowIndex) === undefined) return null;
    const nowSection = this.playbackMap(getNestedIndex(this.#sectionsFlowMap, nowIndex))[0]
    
    let nextIndex
    if(breakout instanceof Array)
      nextIndex = breakout
    else{
      nextSection(this.#sectionsFlowMap, breakout)
      nextIndex = [...this.#sectionsFlowMap.index]
      
      Tone.Draw.schedule(() => {
        const loopIndex = [...nowIndex] as PlayerSectionIndex
        loopIndex[loopIndex.length-1] += 1
        const loops = getLoopCount(this.#sectionsFlowMap, nowIndex)
        if(loops) this.onSectionRepeat?.(nowIndex, loops)
      }, Tone.now())
    }
    
    this.#sectionsFlowMap.index = nowIndex
    const regionGrainLength =  (nowSection.region[1] - nowSection.region[0]) * (Tone.Transport.timeSignature as number);
    const grain = auto ? regionGrainLength : nowSection?.grain
    const nextTime =  this.getNextTime(grain)

    Tone.Draw.schedule(() => {
      this.onSectionWillEnd?.(nowIndex, nextTime)
      this.onSectionWillStart?.(nextIndex, nextTime)
    }, Tone.now());
    
    this.schedule(nextIndex, nextTime, ()=>{
      Tone.Draw.schedule(() => {
        this.onSectionPlayEnd?.(nowIndex)
        this.onSectionPlayStart?.(nextIndex)
        this.#sectionLastLaunchTime = Tone.Transport.position as BarsBeatsSixteenths
      }, Tone.now());
    }) 
  }

  schedule(sectionIndex: PlayerSectionIndex, nextTime: BarsBeatsSixteenths, onScheduleCallback?: ()=>void){
    if(this.#pending) return
    const sectionID = getNestedIndex(this.#sectionsFlowMap, sectionIndex)
    const [section, sectionFlags] = this.playbackMap(sectionID)

    let sectionOverrides: PlayerSectionOverrides = {}
    sectionFlags.forEach(f=>{
      if(f === '>') sectionOverrides = {...sectionOverrides, autoNext: true}
      if(f === 'X' || f === 'x') sectionOverrides = {...sectionOverrides, legato: true}
    })
    if(this.verbose) console.log('Section overrides', sectionOverrides)

    if(this.verbose) console.log('Next schedule to happen at: ', nextTime);
    
    this.#pending = {id: null, when: nextTime}
    this.#pending.id = Tone.Transport.scheduleOnce((t)=>{
      if(this.verbose) console.log('Schedule done for time: ', nextTime, t)
      this.#trackPlayers.forEach((track,i)=>{
        const nextTrack = track.current === track.a ? track.b : track.a

        nextTrack.loopStart = section.region[0]+'m';
        nextTrack.loopEnd = section.region[1]+'m';
        nextTrack.loop = true;
        try{
          const nonLegatoStart = ()=>{
            console.log('non legato section', sectionIndex, track.name)
            track.current.stop(t);
            nextTrack.volume.setValueAtTime(track.volumeLimit, t)
            nextTrack.start(t,section.region[0]+'m');
          }
          const doLegatoStart = (legatoTrack, legatoDT) => {
              track.current.volume.setValueAtTime(track.volumeLimit, t + legatoDT);
              track.current.volume.linearRampToValueAtTime(-60, t + legatoDT)
              track.current.stop(t + legatoDT);

              nextTrack.volume.setValueAtTime(-60, t + legatoDT);
              nextTrack.volume.linearRampToValueAtTime(track.volumeLimit, t + legatoDT)
              nextTrack.start(t,section.region[0]+'m');
              
              if(this.verbose) console.log('legato track xfade', track.name, legatoTrack)
          }

          if(sectionOverrides?.legato){
            console.log('legato section', sectionIndex)
            let legatoDT: Time;
            let legatoTracks: string[] | undefined;
            if(typeof section?.legato === 'object'){
              legatoDT = Tone.Time((section?.legato?.duration || 4) + 'n').toSeconds()
              legatoTracks = section.legato?.xfades
            }
            else
              legatoDT = Tone.Time((section?.legato || 4) + 'n').toSeconds()
            
            console.log('legato', t, legatoDT)
            
            if(legatoTracks){
              let legatoTrackFound = false
              legatoTracks.forEach((legatoTrack)=>{
                if(track.name === legatoTrack){
                  legatoTrackFound = true
                  doLegatoStart(legatoTrack,legatoDT)
                }
              })
              if(!legatoTrackFound) nonLegatoStart()
            }
            else
              doLegatoStart(track.name, legatoDT)
          }
          else{
            nonLegatoStart()
          }
          track.current = nextTrack;
        }catch(error){
          if(this.verbose) console.log('Empty track playing ',this.#tracksList[i], error);
        }
      })
      this.playingNow = {index:sectionIndex, name: sectionID};
      if(this.verbose) console.log('Playing now',this.playingNow)
      onScheduleCallback?.()
      this.#sectionsFlowMap.index = [...sectionIndex]
      this.#sectionBeat = -1
      this.#sectionLen = (section.region[1] - section.region[0]) * (Tone.Transport.timeSignature as number)
      this.#pending = null

      if(sectionOverrides?.autoNext){
        this.advanceSection(false, true)
      }
    },nextTime)
  }

  // //TODO: add this function
  // injectNamedSection(name){
  //   if(!this.#sectionsFlowMap[name]) return null
  //   const namedIdx = ??
  //   const idx = getNestedIndex(this.#sectionsFlowMap, namedIdx)
  // }

  cancel(){
    if(!this.#pending) return
    if(this.#pending?.id) Tone.Transport.clear(this.#pending.id)
    this.#pending = null
    
    Tone.Draw.schedule(() => {
      this.onSectionWillEnd?.(null)
      this.onSectionWillStart?.(null)
    }, Tone.now())
  }

//================Effects===========
  rampTrackVolume(trackIndex: string | number, db: number, inTime: BarsBeatsSixteenths | Time = 0, sync: boolean = true){
    if(!this.state) return
    let idx: number | null = null;
    if(typeof trackIndex === 'string'){
      this.#tracksList?.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      })
      if(idx === null) return
    }
    else if(typeof trackIndex === 'number'){
      idx = trackIndex
    }
    else return
    if(idx === null) return;
    
    this.#trackPlayers[idx].a.volume.linearRampTo(db,inTime, sync ? '@4n' : undefined)
    this.#trackPlayers[idx].b.volume.linearRampTo(db,inTime, sync ? '@4n' : undefined)
  }
  rampTrackFilter(trackIndex: string | number, percentage: number, inTime: BarsBeatsSixteenths | Time = 0, sync: boolean = true){
    if(!this.state) return
    let idx: number | null = null;
    if(typeof trackIndex === 'string'){
      this.#tracksList?.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      })
      if(idx === null) return
    }
    else if(typeof trackIndex === 'number'){
      idx = trackIndex
    }
    else return
    if(idx === null) return;

    this.#trackPlayers[idx].filter.frequency.linearRampTo(100 + (percentage * 19900), inTime, sync ? '@4n' : undefined)
  }
  crossFadeTracks(outIndexes: (string | number)[], inIndexes: (string | number)[], inTime: BarsBeatsSixteenths | Time = '1m', sync: boolean = true){
    inIndexes?.forEach(i=>{
      this.rampTrackVolume(i, 0,inTime,sync)
    })
    if(!this.state) return
    outIndexes?.forEach(i=>{
      this.rampTrackVolume(i,-50,inTime,sync)
    }) 
  }

//================Various==========
getNextTime(grain = undefined){
  const _grain = grain || this.#playbackInfo?.grain || this.#playbackInfo?.meter?.[0];
  const nt = quanTime(Tone.Transport.position as BarsBeatsSixteenths, _grain, this.#playbackInfo?.meter, this.#sectionLastLaunchTime)
  if(this.#verbose) console.log('nexttime',nt,Tone.Transport.position, _grain, this.#playbackInfo?.meter, this.#sectionLastLaunchTime)
  return nt
}


#verbose = false;
set verbose(state){
  this.#verbose = state;
  if(state) console.log("JSONg player verbose mode");
}
get verbose(){
  return this.#verbose;
}
  constructor(verbose:boolean = true){
    this.verbose = verbose
    this.state = null;
    this.#metronome = new Tone.Synth().toDestination()
    this.#metronome.envelope.attack = 0;
    this.#metronome.envelope.release = 0.05;
    if(this.verbose) console.log("New", this);
  }


//=======Time===============

  //Time quantization for scheduling events musically
}

module.exports = {JSONg}