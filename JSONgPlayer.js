class JSONgPlayer {
  //parser version 0.0.1
  #tone;

  #verbose; //debug messages
  #manifest; //copy of .json file
  #section; //current section details
  
  #state = null;
  set state(value){
    this.#state = value
    this.onStateChange?.(value)
  }
  get state(){
    return this.#state
  }

  #playingNow; //name of current section that is playing
  set playingNow(v){
    this.#playingNow = v
    this.onSectionPlayStart?.(v)
  }
  get playingNow (){
    return this.#playingNow
  }

  trackPlayers = []; //tonejs track players
  srcPool = [];

  #metronome; 
  #meterBeat;
  set meterBeat(v){
    this.#meterBeat = v
    this.onSongTransport?.(this.#tone.Transport.position)
  }
  get meterBeat(){
    return this.#meterBeat
  }

//==================Loader==============
  #load;

  parse(path){
    return new Promise((resolve, reject)=>{
    
    const sep = (path.endsWith('/')  ? ' ' : '/')
    const _loadpath = path + sep;
    if(this.#verbose) console.log('Loading from path',_loadpath)
    fetch(_loadpath + 'audio.jsong').then(resp => {
      resp.text().then(txt => {
        // console.log(txt)
      const data = JSON.parse(txt)
        
    if(this.#verbose) console.log('JSONg loaded',data)
    if(data?.type !== 'jsong') {
      reject('manifest','Invalid manifest file')
      return
    }

    this.#manifest = structuredClone(data)
    const src_keys = Object.keys(this.#manifest.sources)

    this.#load = {
      required: this.#manifest.tracks.length, 
      loaded: 0, 
      failed: 0
    };

    const spawnTracks = ()=>{
      this.trackPlayers = []
      for(const track of this.#manifest.tracks){
        const a = new this.#tone.Player().toDestination()
        a.volume.value = track.volumeDB
        a.buffer = this.srcPool[track.source]
        this.trackPlayers.push(a)
      }
    }

    const checkLoad = ()=>{
      if(this.#load.loaded+this.#load.failed === this.#load.required) {
        this.state = 'stopped'
        //full load
        if(this.#verbose) console.log('Loading sequence done', this.#load); 
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

    this.srcPool = {} 
    for(const src_id of src_keys){
      const data = this.#manifest.sources[src_id]
      const buffer = new this.#tone.ToneAudioBuffer();
      if(this.#verbose) console.log('Current source id', src_id)
      buffer.baseUrl = window.location.origin

      const url = data.startsWith('data') ? data : _loadpath + data
      buffer.load(url).then((tonebuffer)=>{
        this.#load.loaded++;
        this.srcPool[src_id] = tonebuffer
        checkLoad()
        if(this.#verbose) console.log('Source loaded ', src_id, tonebuffer)
      }).catch((e)=>{
        this.#load.failed++;
        checkLoad()
        console.log('Failed loading source ', src_id, data, ' ', e)
      })
    }

    this.#metronome = new this.#tone.Synth().toDestination()
    this.#metronome.envelope.attack = 0;
    this.#metronome.envelope.release = 0.05;
    this.#metronome.volume.value = this.#manifest.playback.metronomeDB || 0;
    
    this.#tone.Transport.bpm.value = this.#manifest.playback.bpm
    this.#tone.Transport.timeSignature = this.#manifest.playback.meter

    this.playingNow = null;
    this.setSection(0)
    this.stop() 
    if(this.#verbose) console.log("Parsed song ",this)
    
      })
    })

    })

  }

  
//================Controls===========
  start(startFrom = null){
    this.next(true, (startFrom 
      ? startFrom 
    : this.state === 'stopped' 
      ? this.#manifest.playback.flow[0] 
      : undefined
    ));
    
    if(this.state === 'stopped'){

      if(this.#manifest.playback.metronome){
        this.#tone.Transport.scheduleRepeat((t)=>{
          const note = this.#manifest.playback.metronome[this.meterBeat === 0 ? 0 : 1]
          this.#metronome.triggerAttackRelease(note,'32n',t);
          this.meterBeat = (this.meterBeat + 1) % this.#tone.Transport.timeSignature
        },'4n');
      }

      this.meterBeat = 0;
      this.#tone.Transport.start('+0.1s')
      this.state = 'started'
      if(this.#verbose) console.log("JSONgPlayer player started")
    }
  }

  stop(immidiate = true){
    if(this.state === 'stopped') return
    this.#tone.Transport.stop()
    this.#tone.Transport.cancel()
    this.#tone.Transport.clear()
    this.trackPlayers.forEach((p,i)=>{
      try{
          p.stop(!immidiate ? this.#getNextTime() : undefined);
      }catch(error){
        if(this.#verbose) console.log('Empty track stopping ',this.#manifest.tracks[i]);
      }
    })

    this.meterBeat = 0;
    this.state = 'stopped'
    if(this.#verbose) console.log("JSONgPlayer player stopped")
  }


  next(breakout, sectionName = null){
    const nextTime = this.#getNextTime()
    if(this.#verbose) console.log('Next schedule to happen at: ', nextTime);
    
    this.#tone.Transport.scheduleOnce((t)=>{
      if(sectionName)
        this.setSection(sectionName)
      else
        this.nextSection(breakout)
      
      const s = this.#section.section
      this.trackPlayers.forEach((p,i)=>{
        p.loopStart = s[0]+'m';
        p.loopEnd = s[1]+'m';
        p.loop = true;
        try{
          p.start(t,s[0]+'m');
        }catch(error){
          if(this.#verbose) console.log('Empty track playing ',this.#manifest.tracks[i]);
        }
      })
      this.playingNow = this.#section;
      if(this.#verbose) console.log(this.playingNow)
    },nextTime)
  }

//================Flow===========
  setSection(section){
    let index = null
    let subIndex = null

    //[section, subsection]
    if(Array.isArray(section)){
      [index, subIndex] = section
    }
    else if(typeof section === 'string'){
      this.#manifest.playback.flow.forEach((v,i)=>{
        if(v === section) index = i
      })
    }
    else if(typeof section === 'number'){
      index = section
    }

    if(index === null){
      if(this.#verbose) console.log("No set section index!", typeof section, section )
      return
    }
    const curFlowLen = this.#manifest.playback.flow.length
    const curIndex = index % curFlowLen
    const curSection = this.#manifest.playback.flow[curIndex]
    const isSubloop = curSection instanceof Array

    let _subIndex = (subIndex !== null ? subIndex : 0)
    let sectionName = curSection
    let finiteRepeat = false
    if(isSubloop){
      finiteRepeat = Number.isInteger(curSection[0])
      _subIndex = _subIndex % (curSection.length - (finiteRepeat ? 1 : 0))  
      sectionName = curSection[finiteRepeat ? _subIndex+1 : _subIndex]
    }

    this.#section = {
      flowIndex: curIndex,
      subIndex: _subIndex,
      isSubloop,
      currentRepeats: 0,
      targetRepeats: isSubloop ? (finiteRepeat ? curSection[0] : Infinity) : 0,
      grain: this.#manifest.playback.grain,
      ...this.#manifest.playback.map[sectionName]
    }
    // if(this.#verbose) console.log(index, _subIndex, sectionName, {...this.#section})
  }

  nextSection(breakout = false){
    const normalAdvance = ()=>{
      this.setSection(this.#section.flowIndex + 1)
      if(this.#section.isSubloop) {
        this.#section.currentRepeats = this.#section.targetRepeats 
        if(this.#verbose) console.log(`Enter subloop: remaining loops: ${this.#section.currentRepeats}`)
      }
    }
    const subAdvance = ()=>{
      this.setSection(this.#section.flowIndex, this.#section.subIndex + 1)
    }

    if(this.#section?.isSubloop && !breakout){
      subAdvance()
      if(this.#section.subIndex === 0){
        this.#section.currentRepeats -= 1
        if(this.#verbose) console.log(`Subloop Looped, remaining loops: ${this.#section.currentRepeats}`)
        if(this.#section.currentRepeats === 0){
          if(this.#verbose) console.log("Exit Subloop")
          normalAdvance()
        }
      }
    }
    else{
      if(breakout && this.#verbose) console.log("Break out of Subloop")
      normalAdvance()
    }
  }

//================Effects===========
  rampTrackVolume(trackIndex, db, inTime = 0, sync = true){
    if(!this.state) return
    this.trackPlayers[trackIndex].volume.rampTo(db,inTime, sync ? '@4n' : undefined)
  }


//================Various==========
  constructor(tone, data = null, verbose = true){
    this.#tone = tone;
    this.#verbose = verbose
    this.state = null;
    if(this.#verbose) console.log("new", this)
  }

  setVerbose(state){
    this.#verbose = state;
  }

  #nextRegionTransportValue(){

  }
  #currentRegionTransportValues(){
    return {beat: this.meterBeat, len: 4 }
  }

//=======Time===============
  #getNextTime(){
    const grain = this.#section.grain;
    const meterDenominator = this.#tone.Transport.timeSignature
    return JSONgPlayer.QuanTime(this.#tone.Transport.position, [grain, meterDenominator])
  }

  //Time quantization for scheduling events musically
  static QuanTime(nowTime, meter = [4,4], gridAlignStart = undefined){
    const [atBeats, barBeats] = meter
    const units = nowTime.split(':')
    const nowBar = parseInt(units[0])
    const nowBeat = parseInt(units[1])
  
    const quantize = (unit,q)=>Math.trunc((unit + q)/q)*q;
  
    //if align is less than bar length
    if(atBeats < barBeats){
      const adv =  quantize(nowBeat,atBeats)
      const nextBeat = adv%barBeats
      const nextBar = nowBar + Math.trunc(adv/barBeats)
      return `${nextBar}:${nextBeat}:0`
    }
    else {
      //bar times, adhere to gridAlign
      const adv = atBeats/barBeats
      if(gridAlignStart !== undefined){
        return `${quantize(nowBar,adv) + gridAlignStart}:0:0`
      }
      return `${nowBar + adv}:0:0`
    }
  }
}

module.exports = {JSONgPlayer}