// const {quanTime} = require('./quantime')
// const {nextSection} = require('./nextSection')
// const {buildSection} = require('./buildSection')
// const {setNestedIndex, getNestedIndex} = require('./nestedIndex')
const {quanTime, nextSection, buildSection, setNestedIndex, getNestedIndex} = require('jsong');

class JSONg {
  //parser version 0.0.2
  #tone;

  #tracksList;
  #playbackInfo;
  #playbackFlow;
  #playbackMap;
  #sectionsFlowMap;
  #sourcesMap;

  // audio players and sources
  #trackPlayers = [];
  #sourceBuffers = [];

  onSectionPlayStart = null;
  onSectionPlayEnd = null;
  onSectionWillStart = null;
  onSectionWillEnd = null;

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
  set meterBeat(v){
    this.#meterBeat = v
    this.#tone.Draw.schedule(() => {
      const nowIndex = [...this.#sectionsFlowMap.index]
      const nowSection = this.#playbackMap[getNestedIndex(this.#sectionsFlowMap, nowIndex)]
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
  return this.parse(_loadpath + 'audio.jsong', null);
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

    this.stop(0)
    this.state = null; 

    this.#playbackInfo = {
      bpm: data.playback.bpm,
      meter: data.playback.meter,
      totalMeasures: data.playback.totalMeasures,
      grain: data.playback?.grain || 4,
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

    const spawnTracks = ()=>{
      this.trackPlayers = []
      for(const track of this.#tracksList){
        const name = track.source ? track.source : track.name;

        const a = new this.#tone.Player()
        a.volume.value = track.volumeDB
        a.buffer = this.#sourceBuffers[name]

        const b = new this.#tone.Player()
        b.volume.value = track.volumeDB
        b.buffer = this.#sourceBuffers[name]

        const filter = new this.#tone.Filter(20000, "lowpass").toDestination()
        if(track?.filter?.resonance) filter.set('Q',track.filter.resonance) 
        if(track?.filter?.rolloff) filter.rolloff = track.filter.rolloff
        else filter.rolloff = -24;
        a.connect(filter)
        b.connect(filter)

        this.#trackPlayers.push({
          a,b, current: a, filter
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

    this.#metronome = new this.#tone.Synth().toDestination()
    this.#metronome.envelope.attack = 0;
    this.#metronome.envelope.release = 0.05;
    this.#metronome.volume.value = this.#playbackInfo.metronomeDB || 0;
    
    this.#tone.Transport.bpm.value = this.#playbackInfo.bpm
    this.#tone.Transport.timeSignature = this.#playbackInfo.meter

    this.playingNow = null;

    if(this.verbose) console.log("Parsed song ",this)
    
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
        if(fadein){
          t.a.volume.value = -50;
          t.b.volume.value = -50;
        }
        else{
          t.a.volume.value = this.#tracksList[i].volumeDB
          t.b.volume.value = this.#tracksList[i].volumeDB
        }
      })

      this.#tone.Transport.cancel()
      this.#sectionsFlowMap.index = from || [0]

      this.#tone.Draw.schedule(() => {
        this?.onSectionWillEnd?.(null)
        this?.onSectionWillStart?.(this.#sectionsFlowMap.index)
      },this.#tone.now())

      this.schedule(this.#sectionsFlowMap.index, '0:0:0', ()=>{
        this.#tone.Draw.schedule(() => {
          this?.onSectionPlayEnd?.(null)
          this?.onSectionPlayStart?.(this.#sectionsFlowMap.index)
        },this.#tone.now())
        if(!fadein) return
        this.#trackPlayers.forEach((t,i)=>{
          this.rampTrackVolume(i,this.#tracksList[i].volumeDB,fadein)
        })
      })

      this.#tone.Transport.scheduleRepeat((t)=>{
        const note = this.#playbackInfo.metronome[this.meterBeat === 0 ? 0 : 1]
        this.meterBeat = (this.meterBeat + 1) % this.#tone.Transport.timeSignature
        if(this.#playbackInfo.metronome || this.verbose)
          this.#metronome.triggerAttackRelease(note,'32n',t);
      },'4n');

      this.meterBeat = 0;
      this.#tone.Transport.start('+0.1s')
      this.state = 'started'
    }
    else if(this.state === 'started'){
      this.advanceSection(skip)
    }
  }

  stop(after = '4n', fadeout= true){
    if(this.state === 'stopped' || this.state === 'stopping') return
    this.state = 'stopping';
    const afterSec = this.#tone.Time(after).toSeconds()
    const when = after ? afterSec + this.#tone.Time(this.#tone.Transport.position)
    : this.#tone.now();
    console.log(when, this.#tone.now())
    
    if(fadeout && after){
      this.#trackPlayers.forEach((p,i)=>{
        this.rampTrackVolume(i,-50, afterSec);
      })
      this?.onSectionWillStart?.(null) 
      this?.onSectionWillEnd?.(this.#sectionsFlowMap?.index)  
    }

    this.#tone.Transport.scheduleOnce((t)=>{
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

      this?.onSectionPlayStart?.(null) 
      this?.onSectionPlayEnd?.(this.#sectionsFlowMap.index)  
      this.state = 'stopped'
    },when)
    
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

  advanceSection(breakout = false){
    if(this.#pending) return
    
    const nowIndex = [...this.#sectionsFlowMap.index]
    const nowSection = this.#playbackMap[getNestedIndex(this.#sectionsFlowMap, nowIndex)]
    
    nextSection(this.#sectionsFlowMap, breakout)
    
    const nextIndex = [...this.#sectionsFlowMap.index]
    this.#sectionsFlowMap.index = nowIndex
    const nextTime =  this.getNextTime(nowSection)

    this.#tone.Draw.schedule(() => {
      this.onSectionWillEnd?.(nowIndex, nextTime)
      this.onSectionWillPlay?.(nextIndex, nextTime)
    }, this.#tone.now());
    
    this.schedule(nextIndex, nextTime, ()=>{
      this.#tone.Draw.schedule(() => {
        this.onSectionPlayEnd?.(nowIndex)
        this.onSectionPlayStart?.(nextIndex)
      }, this.#tone.now());
    }) 
  }

  schedule(sectionIndex, whenPositionTime = undefined, onScheduleCallback = undefined){
    if(this.#pending) return
    const section = this.#playbackMap[getNestedIndex(this.#sectionsFlowMap, sectionIndex)]

    const nextTime = typeof whenPositionTime === 'string' ? whenPositionTime : this.getNextTime(section)
    if(this.verbose) console.log('Next schedule to happen at: ', nextTime);
    
    this.#pending = this.#tone.Transport.scheduleOnce((t)=>{
      if(this.verbose) console.log('Schedule done for time: ', nextTime, t)
      this.#trackPlayers.forEach((track,i)=>{
        const p = track.current === track.a ? track.b : track.a
        
        p.loopStart = section.region[0]+'m';
        p.loopEnd = section.region[1]+'m';
        p.loop = true;
        try{
          track.current.stop(t);
          p.start(t,section.region[0]+'m');
          track.current = p;
        }catch(error){
          if(this.verbose) console.log('Empty track playing ',this.#tracksList[i]);
        }
      })
      this.playingNow = sectionIndex;
      if(this.verbose) console.log('Playing now',this.playingNow)
      onScheduleCallback?.()
      this.#sectionsFlowMap.index = [...sectionIndex]
      this.#sectionBeat = -1
      this.#sectionLen = (section.region[1] - section.region[0]) * this.#tone.Transport.timeSignature
      this.#pending = false
    },nextTime)
  }

  cancel(){
    if(!this.#pending) return
    this.#tone.Transport.clear(this.#pending)
    this.#pending = null
    this.onSectionWillEnd?.(false)
    this.onSectionWillPlay?.(false)
  }

//================Effects===========
  rampTrackVolume(trackIndex, db, inTime = 0, sync = true){
    if(!this.state) return
    let idx = trackIndex
    if(typeof trackIndex === 'string'){
      this.#tracksList.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      })
    }
    this.#trackPlayers[idx].a.volume.rampTo(db,inTime, sync ? '@4n' : undefined)
    this.#trackPlayers[idx].b.volume.rampTo(db,inTime, sync ? '@4n' : undefined)
  }
  rampTrackFilter(trackIndex, percentage, inTime = 0, sync = true){
    if(!this.state) return
    let idx = trackIndex
    if(typeof trackIndex === 'string'){
      this.#tracksList.forEach((o,i)=>{
        if(o.name === trackIndex) idx = i
      })
    }
    this.#trackPlayers[idx].filter.frequency.rampTo(100 + (percentage * 19900), inTime, sync ? '@4n' : undefined)
  }


//================Various==========
getNextTime(section){
  const grain = section?.grain ? section.grain : this.#playbackInfo.grain;
  const meterDenominator = this.#tone.Transport.timeSignature
  return quanTime(this.#tone.Transport.position, [grain, meterDenominator])
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
    if(this.verbose) console.log("New", this);
  }


//=======Time===============

  //Time quantization for scheduling events musically
}

module.exports = {JSONg}