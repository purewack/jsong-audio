class JSONg {
  //parser version 0.0.2
  #tone;

  #manifest; //copy of .json file

  //events
  onStateChange = null;
  onSongTransport = null;
  onSectionTransport = null;
  onSectionPlayStart = null;
  onSectionPlayEnd = null;
  onSectionWillStart = null;
  onSectionWillEnd = null;

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
    // this.onSectionPlayStart?.(v)
  }
  get playingNow (){
    return this.#playingNow
  }

// audio players and sources
  #trackPlayers = [];
  #srcPool = [];

  //metronome
  #metronome; 

  #meterBeat = {
    songCurrent: 0,
    songTotal: 0,
    sectionCurrent: 0,
    sectionTotal: 0,
  };
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
    if(this.verbose) console.log('Loading from path',_loadpath)
    fetch(_loadpath + 'audio.jsong').then(resp => {
      resp.text().then(txt => {
        // console.log(txt)
      const data = JSON.parse(txt)
        
    if(this.verbose) console.log('JSONg loaded',data)
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
        a.buffer = this.#srcPool[track.source]
        this.#trackPlayers.push(a)
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

    this.#srcPool = {} 
    for(const src_id of src_keys){
      const data = this.#manifest.sources[src_id]
      const buffer = new this.#tone.ToneAudioBuffer();
      if(this.verbose) console.log('Current source id', src_id)
      buffer.baseUrl = window.location.origin

      const url = data.startsWith('data') ? data : _loadpath + data
      buffer.load(url).then((tonebuffer)=>{
        this.#load.loaded++;
        this.#srcPool[src_id] = tonebuffer
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
    this.#metronome.volume.value = this.#manifest.playback.metronomeDB || 0;
    
    this.#tone.Transport.bpm.value = this.#manifest.playback.bpm
    this.#tone.Transport.timeSignature = this.#manifest.playback.meter

    this.playingNow = null;
    this.setSection(0)
    this.stop() 
    if(this.verbose) console.log("Parsed song ",this)
    
      })
    })

    })

  }

  
//================Controls===========
  play(from = null, skip = false){
  
    next(true, (this.state === 'stopped' 
      ? this.#manifest.playback.flow[0] 
      : from
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
    }
  }

  stop(immidiate = true){
    if(this.state === 'stopped') return
    this.#tone.Transport.stop()
    this.#tone.Transport.cancel()
    this.#tone.Transport.clear()
    this.#trackPlayers.forEach((p,i)=>{
      try{
          p.stop(!immidiate ? this.#getNextTime() : undefined);
      }catch(error){
        if(this.verbose) console.log('Empty track stopping ',this.#manifest.tracks[i]);
      }
    })

    this.meterBeat = 0;
    this.state = 'stopped'
    if(this.verbose) console.log("JSONg player stopped")
  }



//================Flow===========
  #section; //current section details
  gotoSection(section){
    
    this.#section = {
      flowIndex: curIndex,
      subIndex: _subIndex,
      isSubloop,
      currentRepeats: 0,
      targetRepeats: isSubloop ? (finiteRepeat ? curSection[0] : Infinity) : 0,
      grain: this.#manifest.playback.grain,
      ...this.#manifest.playback.map[sectionName]
    }
    // if(this.verbose) console.log(index, _subIndex, sectionName, {...this.#section})
  }

  advanceSection(breakout = false){
    const normalAdvance = ()=>{
      this.setSection(this.#section.flowIndex + 1)
      if(this.#section.isSubloop) {
        this.#section.currentRepeats = this.#section.targetRepeats 
        if(this.verbose) console.log(`Enter subloop: remaining loops: ${this.#section.currentRepeats}`)
      }
    }

    if(breakout && this.verbose) console.log("Break out of Subloop")
    normalAdvance()
  }

  schedule(section, atScheduleTime = undefined){
    const nextTime = this.#getNextTime(section)
    if(this.verbose) console.log('Next schedule to happen at: ', nextTime, ' ...');
    
    this.#tone.Transport.scheduleOnce((t)=>{
      if(this.verbose) console.log('Scehdule done for time: ', nextTime)
      atScheduleTime?.()
      this.#trackPlayers.forEach((p,i)=>{
        p.loopStart = section.loopPoints[0]+'m';
        p.loopEnd = section.loopPoints[1]+'m';
        p.loop = true;
        try{
          p.start(t,s[0]+'m');
        }catch(error){
          if(this.verbose) console.log('Empty track playing ',this.#manifest.tracks[i]);
        }
      })
      this.playingNow = section;
      if(this.verbose) console.log(this.playingNow)
    },nextTime)
  }


//================Effects===========
  rampTrackVolume(trackIndex, db, inTime = 0, sync = true){
    if(!this.state) return
    this.#trackPlayers[trackIndex].volume.rampTo(db,inTime, sync ? '@4n' : undefined)
  }


//================Various==========
  constructor(tone, data = null, verbose = true){
    this.#tone = tone;
    this.verbose = verbose
    this.state = null;
    if(this.verbose) console.log("New", this);
  }

  #verbose = false;
  set verbose(state){
    this.#verbose = state;
    if(state) console.log("JSONg player verbose mode");
  }
  get verbose(){
    return this.#verbose;
  }

  #nextRegionTransportValue(){

  }
  #currentRegionTransportValues(){
    return {beat: this.meterBeat, len: 4 }
  }

//=======Time===============
  #getNextTime(section){
    const grain = section?.grain ? section.grain : this.#manifest.playback.grain;
    const meterDenominator = this.#tone.Transport.timeSignature
    return JSONg.QuanTime(this.#tone.Transport.position, [grain, meterDenominator])
  }

  //Time quantization for scheduling events musically
}

module.exports = {JSONg}