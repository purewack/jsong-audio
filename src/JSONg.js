const {quanTime} = require('./quantime')
const {nextSection} = require('./nextSection')
const {buildSection} = require('./buildSection')
const {getLoopCount} = require('./getLoopCount')
const {setNestedIndex, getNestedIndex} = require('./nestedIndex')
// const {quanTime, nextSection, buildSection, setNestedIndex, getNestedIndex, getLoopCount} = require('jsong');

class JSONg {
  //parser version 0.0.2
  #tone;

  #tracksList;
  #playbackInfo;
  #playbackFlow;
  #playbackMap;
  #sectionsFlowMap;
  #sourcesMap;

  playbackMap(key){ 
    const k = key.split('-')
    return [this.#playbackMap[k[0]] , k]
  }

  // audio players and sources
  #trackPlayers = null;
  #sourceBuffers = null;

  onSectionPlayStart = null;
  onSectionPlayEnd = null;
  onSectionWillStart = null;
  onSectionWillEnd = null;
  onSectionRepeat = null;

  onStateChange = null;
  #state = null;
  set state(value){
    this.#state = value
    this.#tone.Draw.schedule(() => {
      this.onStateChange?.(value)
    }, this.#tone.now());
  }
  get state(){
    return this.#state
  }

  //transport and meter
  onTransport = null;
  #metronome; 
  #meterBeat = 0
  #sectionBeat = 0
  #sectionLen = 0
  #sectionLastLaunchTime = '0:0:0'
  set meterBeat(v){
    this.#meterBeat = v
    this.#tone.Draw.schedule(() => {
      const nowIndex = [...this.#sectionsFlowMap.index]
      const nowSection = this.playbackMap(getNestedIndex(this.#sectionsFlowMap, nowIndex))[0]
      if(nowSection){
        this.#sectionBeat = (this.#sectionBeat+1) % this.#sectionLen
        this.onTransport?.(this.#tone.Transport.position, [this.#sectionBeat,this.#sectionLen])
      }
      else 
        this.onTransport?.(this.#tone.Transport.position)
    }, this.#tone.now());
  }
  get meterBeat(){
    return this.#meterBeat
  }


//==================Loader==============
  #load;

parse(folderPath){
  const sep = (folderPath.endsWith('/')  ? ' ' : '/')
  const _loadpath = folderPath + sep;
  if(this.verbose) console.log('Loading from path',_loadpath)
  return this.parse(_loadpath + 'audio.jsong', _loadpath);
}

parse(manifestPath, dataPath){
  return new Promise((resolve, reject)=>{
  
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
      this.#tone.Transport.cancel()
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

        const a = new this.#tone.Player()
        a.volume.value = v
        a.buffer = buf

        const b = new this.#tone.Player()
        b.volume.value = v
        b.buffer = buf

        const filter = new this.#tone.Filter(20000, "lowpass").toDestination()
        if(track?.filter?.resonance) filter.set('Q',track.filter.resonance) 
        if(track?.filter?.rolloff) filter.rolloff = track.filter.rolloff
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
          resolve(true)
          spawnTracks()
        }
        //partial load
        else if(this.#load.loaded && this.#load.loaded < this.#load.required){
          resolve('loading',false)
          spawnTracks()
        }
        //failed load
        else{
          reject()
          this.state = null;
        }
      }
    }

    this.#sourceBuffers = {} 
    for(const src_id of src_keys){
      const data = this.#sourcesMap[src_id]
      const buffer = new this.#tone.ToneAudioBuffer();
      // if(this.verbose) console.log('Current source id', src_id)
      buffer.baseUrl = window.location.origin
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
    this.#tone.Transport.position = '0:0:0'
    this.#metronome.volume.value = this.#playbackInfo.metronomeDB || 0;
    
    this.#tone.Transport.bpm.value = this.#playbackInfo.bpm
    this.#tone.Transport.timeSignature = this.#playbackInfo.meter

    this.playingNow = null;

    if(this.verbose) {
      console.log("Parsed song ",this)
      console.log("meter ",this.#tone.Transport.timeSignature, this.#playbackInfo)
    }
    })
  })

  })

}

  
//================Controls===========
  play(from = null, skip = false, fadein = '1m'){

    if(this.state === 'stopping') return;
    
    if(this.state === 'stopped'){    
      this.#tone.start()
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

      this.#tone.Transport.cancel()
      this.#sectionsFlowMap.index = from || [0]
      if(getNestedIndex(this.#sectionsFlowMap, this.#sectionsFlowMap.index) === undefined) return null;

      this.#tone.Draw.schedule(() => {
        this?.onSectionWillEnd?.(null)
        this?.onSectionWillStart?.(this.#sectionsFlowMap.index)
      },this.#tone.now())

      this.schedule(this.#sectionsFlowMap.index, '0:0:0', ()=>{
        this.#tone.Draw.schedule(() => {
          this?.onSectionPlayEnd?.(null)
          this?.onSectionPlayStart?.(this.#sectionsFlowMap.index)
          this.#sectionLastLaunchTime = this.#tone.Transport.position
        },this.#tone.now())
        if(!fadein) return
        this.#trackPlayers.forEach((t,i)=>{
          const vol = this.#tracksList[i]?.volumeDB || 0
          this.rampTrackVolume(i, vol, fadein)
        })
      })

      this.meterBeat = 0
      this.#sectionBeat = -1
      this.#tone.Transport.position = '0:0:0'
      this.#tone.Transport.scheduleRepeat((t)=>{
        const note = this.#playbackInfo.metronome[this.meterBeat === 0 ? 0 : 1]
        this.meterBeat = (this.meterBeat + 1) % this.#tone.Transport.timeSignature
        if(this.#playbackInfo.metronome || this.verbose)
          this.#metronome.triggerAttackRelease(note,'64n',t);
      },'4n');

      this.#tone.Transport.start('+0.1s')
      this.state = 'started'
    }
    else if(this.state === 'started'){
      this.advanceSection(skip)
    }
  }

  stop(after = '4n', fadeout= true){
    if(this.state === 'stopped' || this.state === 'stopping') return
    this.state = !after ? 'stopped' : 'stopping';
    const afterSec = this.#tone.Time(after).toSeconds()
    const when = after ? afterSec + this.#tone.Time(this.#tone.Transport.position)
    : this.#tone.now();
    
    if(fadeout && after){
      this.#trackPlayers.forEach((p,i)=>{
        this.rampTrackVolume(i,-60, afterSec);
      })
      this.#tone.Draw.schedule(() => {
        this?.onSectionWillStart?.(null) 
        this?.onSectionWillEnd?.(this.#sectionsFlowMap?.index)  
      }, this.#tone.now())
    }
    const stopping = (t)=>{
      this.#tone.Transport.stop(t)
      this.#tone.Transport.cancel()
      this.#trackPlayers.forEach((p,i)=>{
        try{
            p.a.stop(t);
            p.b.stop(t);
            p.current = p.a
        }catch(error){
          if(this.verbose) console.log('Empty track stopping ',this.#tracksList[i]);
        }
      })
      this.#tone.Draw.schedule(() => {
        this?.onSectionPlayStart?.(null) 
        this?.onSectionPlayEnd?.(this.#sectionsFlowMap.index) 
        this.#sectionLastLaunchTime = null
      },this.#tone.now()) 
      this.state = 'stopped'
    }
    if(after)
      this.#tone.Transport.scheduleOnce(stopping,when)
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
  #pending = null;

  advanceSection(breakout = false, auto = false){
    if(this.#pending) this.cancel()
    
    const nowIndex = [...this.#sectionsFlowMap.index]
    if(getNestedIndex(this.#sectionsFlowMap, nowIndex) === undefined) return null;
    const nowSection = this.playbackMap(getNestedIndex(this.#sectionsFlowMap, nowIndex))[0]
    
    let nextIndex
    if(breakout instanceof Array)
      nextIndex = breakout
    else{
      nextSection(this.#sectionsFlowMap, breakout)
      nextIndex = [...this.#sectionsFlowMap.index]
      
      this.#tone.Draw.schedule(() => {
        const loopIndex = [...nowIndex]
        loopIndex[loopIndex.length-1] += 1
        if(getNestedIndex(this.#sectionsFlowMap,loopIndex) === undefined)
          this.onSectionRepeat?.(nowIndex, getLoopCount(this.#sectionsFlowMap, nowIndex))
      })
    }
    
    this.#sectionsFlowMap.index = nowIndex
    const regionGrainLength =  (nowSection.region[1] - nowSection.region[0]) * this.#tone.Transport.timeSignature;
    const grain = auto ? regionGrainLength : nowSection?.grain
    const nextTime =  this.getNextTime(grain)

    this.#tone.Draw.schedule(() => {
      this.onSectionWillEnd?.(nowIndex, nextTime)
      this.onSectionWillPlay?.(nextIndex, nextTime)
    }, this.#tone.now());
    
    this.schedule(nextIndex, nextTime, ()=>{
      this.#tone.Draw.schedule(() => {
        this.onSectionPlayEnd?.(nowIndex)
        this.onSectionPlayStart?.(nextIndex)
        this.#sectionLastLaunchTime = this.#tone.Transport.position
      }, this.#tone.now());
    }) 
  }

  schedule(sectionIndex, nextTime, onScheduleCallback = undefined){
    if(this.#pending) return
    const sectionID = getNestedIndex(this.#sectionsFlowMap, sectionIndex)
    const [section, sectionFlags] = this.playbackMap(sectionID)

    let sectionOverrides = {}
    sectionFlags.forEach(f=>{
      if(f === '>') sectionOverrides = {...sectionOverrides, autoNext: true}
      if(f === 'X' || f === 'x') sectionOverrides = {...sectionOverrides, legato: true}
    })
    if(this.verbose) console.log('Section overrides', sectionOverrides)

    if(this.verbose) console.log('Next schedule to happen at: ', nextTime);
    
    this.#pending = {id: null, when: nextTime}
    this.#pending.id = this.#tone.Transport.scheduleOnce((t)=>{
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
            let legatoDT
            let legatoTracks = null
            if(typeof section?.legato === 'object'){
              legatoDT = this.#tone.Time((section?.legato?.duration || 4) + 'n').toSeconds()
              legatoTracks = section.legato?.xfades
            }
            else
              legatoDT = this.#tone.Time((section?.legato || 4) + 'n').toSeconds()
            
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
      this.#sectionLen = (section.region[1] - section.region[0]) * this.#tone.Transport.timeSignature
      this.#pending = false

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
    this.#tone.Transport.clear(this.#pending.id)
    this.#pending = null
    
    this.#tone.Draw.schedule(() => {
    this.onSectionWillEnd?.(false)
    this.onSectionWillPlay?.(false)
    })
  }

//================Effects===========
  rampTrackVolume(trackIndex, db, inTime = 0, sync = true){
    if(!this.state) return
    let idx = null
    if(typeof trackIndex === 'string'){
      this.#tracksList?.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      })
      if(idx === null) return
    }
    else{
      idx = trackIndex
    }
    if(this.#trackPlayers?.[idx]){
    this.#trackPlayers[idx].a.volume.linearRampTo(db,inTime, sync ? '@4n' : undefined)
    this.#trackPlayers[idx].b.volume.linearRampTo(db,inTime, sync ? '@4n' : undefined)
    }
  }
  rampTrackFilter(trackIndex, percentage, inTime = 0, sync = true){
    if(!this.state) return
    let idx = null
    if(typeof trackIndex === 'string'){
      this.#tracksList.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      }) 
      if(idx === null) return
    }
    else{
      idx = trackIndex
    }

    this.#trackPlayers[idx].filter.frequency.linearRampTo(100 + (percentage * 19900), inTime, sync ? '@4n' : undefined)
  }
  crossFadeTracks(outIndexes, inIndexes, inTime = '1m', sync = true){
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
  const nt = quanTime(this.#tone.Transport.position, _grain, this.#playbackInfo?.meter, this.#sectionLastLaunchTime)
  if(this.#verbose) console.log('nexttime',nt,this.#tone.Transport.position, _grain, this.#playbackInfo?.meter, this.#sectionLastLaunchTime)
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
  constructor(tone, data = null, verbose = true){
    this.#tone = tone;
    this.verbose = verbose
    this.state = null;
    this.#metronome = new this.#tone.Synth().toDestination()
    this.#metronome.envelope.attack = 0;
    this.#metronome.envelope.release = 0.05;
    if(this.verbose) console.log("New", this);
  }


//=======Time===============

  //Time quantization for scheduling events musically
}

module.exports = {JSONg}