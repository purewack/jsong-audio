class JSONPlayer {
  //parser version 0.0.1
  #tone;

  #verbose; //debug messages
  #manifest; //copy of .json file
  #section; //current section details
  playingNow; //name of current section that is playing

  #metronome; 
  #meterBeat;

  #load;

//==================Loader==============
  parse(data){
    return new Promise((resolve, reject)=>{
    
    if(data?.type !== 'jsonAudio') {
      reject('manifest','Invalid manifest file')
      return
    }

    this.#manifest = structuredClone(data)
    const players = []

    this.#load = {
      required: this.#manifest.tracks.length, 
      loaded: 0, 
      failed: 0
    };
    this.state = null;

    const checkLoad = ()=>{
      if(this.#load.loaded+this.#load.failed === this.#load.required) {
        this.state = 'stopped'
        //full load
        if(this.#verbose) console.log('Loading sequence done', this.#load); 
        if(this.#load.loaded === this.#load.required)
          resolve(true)
        //partial load
        else if(this.#load.loaded && this.#load.loaded < this.#load.required)
          resolve('loading',false)
        //failed load
        else
          reject()
      }
    }

    for(const track of this.#manifest.tracks){
      const player = new this.#tone.Player().toDestination()
      player.baseUrl = window.location.origin
      player.load(track.source).then(()=>{
        this.#load.loaded++;
        checkLoad()
        if(this.#verbose) console.log('Track loaded ',track); 
      }).catch((e)=>{
        this.#load.failed++;
        checkLoad()
        console.log('Failed loading track ', track, ' ', e)
      })
      player.volume.value = track.volumeDB
      players.push(player)
    }
    this.players = players

    this.#metronome = new this.#tone.Synth().toDestination()
    this.#metronome.envelope.attack = 0;
    this.#metronome.envelope.release = 0.05;
    this.#metronome.volume.value = this.#manifest.playback.metronomeDB || 0;
    this.#meterBeat = 0;

    this.#tone.Transport.bpm.value = this.#manifest.playback.bpm
    this.#tone.Transport.timeSignature = this.#manifest.playback.meter

    this.playingNow = null;
    this.playingQueue = null;
    this.setSection(0)
    this.stop() 
    if(this.#verbose) console.log("New ",this)
    
    })
  }

  
//================Controls===========
  start(regionName = null){
    if(this.state === 'started') return

    if(this.#manifest.playback.metronome){
      this.#tone.Transport.scheduleRepeat((t)=>{
        const note = this.#manifest.playback.metronome[this.#meterBeat === 0 ? 0 : 1]
        this.#metronome.triggerAttackRelease(note,'32n',t);
        this.#meterBeat = (this.#meterBeat + 1) % this.#tone.Transport.timeSignature
      },'4n');
    }

    const goToRegion = regionName ? regionName : this.#manifest.playback.flow[0]
    this.next(true, goToRegion);

    this.#tone.Transport.start('+0.1s')

    this.state = 'started'
    if(this.#verbose) console.log("JSONAudio player started")
  }

  stop(immidiate = true){
    if(this.state === 'stopped') return
    this.#tone.Transport.stop()
    this.#tone.Transport.cancel()
    this.#tone.Transport.clear()
    this.players.forEach((p,i)=>{
      try{
          p.stop(!immidiate ? this.#getNextTime() : undefined);
      }catch(error){
        if(this.#verbose) console.log('Empty track stopping ',this.#manifest.tracks[i]);
      }
    })

    this.state = 'stopped'
    if(this.#verbose) console.log("JSONAudio player stopped")
  }

  #getNextTime(){
    const grain = this.#section.grain;
    const meterDenominator = this.#tone.Transport.timeSignature
    return QuanTime(this.#tone.Transport.position, [grain, meterDenominator])
  }

  next(breakout, regionName = null){
    const nextTime = this.#getNextTime()
    if(this.#verbose) console.log('Next schedule to happen at: ', nextTime);
    
    this.#tone.Transport.scheduleOnce((t)=>{
      if(regionName)
        this.setNamedSection(regionName)
      else
        this.nextSection(breakout)
      const r = this.#section.region
      this.players.forEach((p,i)=>{
        p.loopStart = r[0]+'m';
        p.loopEnd = r[1]+'m';
        p.loop = true;
        try{
          p.start(t,r[0]+'m');
        }catch(error){
          if(this.#verbose) console.log('Empty track playing ',this.#manifest.tracks[i]);
        }
      })
      this.playingNow = this.#section;
      if(this.onRegionStart) this.onRegionStart(this.playingNow)
      if(this.#verbose) console.log(this.playingNow)
    },nextTime)
  }

//================Flow===========
  setNamedSection(name){
    let index = 0
    this.#manifest.playback.flow.forEach((v,i)=>{
      if(v === name) index = i
    })
    this.setSection(index)
  }

  setSection(index, subIndex = null){
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
    if(this.#verbose) console.log(index, _subIndex, sectionName, {...this.#section})
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
    this.players[trackIndex].volume.rampTo(db,inTime, sync ? '@4n' : undefined)
  }


//================Various==========
  constructor(tone, data = null, verbose = false){
    this.#tone = tone;
    this.#verbose = verbose
    this.state = null;
  }

  setVerbose(state){
    this.#verbose = state;
  }
}

//Time quantization for scheduling events musically
function QuanTime(nowTime, meter = [4,4], gridAlignStart = undefined){
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

module.exports = {JSONPlayer, QuanTime}