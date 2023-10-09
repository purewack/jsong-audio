class JSONPlayer {
  //version 0.0.1
  #tone;

  #verbose;
  #manifest;
  #section;
  #sectionRepeats;
  playingNow;

  #metronome;
  #meterBeat;

  #load;

  parse(data){
    this.#manifest = structuredClone(data)
    const players = []

    this.#load = {
      required: this.#manifest.tracks.length, 
      loaded: 0, 
      failed: 0
    };
    this.state = null;

    for(const track of this.#manifest.tracks){
      const player = new this.#tone.Player().toDestination()
      player.baseUrl = window.location.origin
      player.load(track.source).then(()=>{
        this.#load.loaded++;
        if(this.#load.loaded+this.#load.failed === this.#load.required) this.state = 'stopped'
        if(this.#verbose) console.log('Track loaded ',track, ' Asset status ', this.#load); 
      }).catch((e)=>{
        this.#load.failed++;
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
    this.#sectionRepeats = 0
    this.setSection(0)
    this.stop() 
    if(this.#verbose) console.log("New ",this)
  }

  start(){
    if(this.state === 'started') return

    if(this.#manifest.playback.metronome)
    this.#tone.Transport.scheduleRepeat((t)=>{
      const note = this.#manifest.playback.metronome[this.#meterBeat === 0 ? 0 : 1]
      this.#metronome.triggerAttackRelease(note,'32n',t);
      this.#meterBeat = (this.#meterBeat + 1) % this.#tone.Transport.timeSignature
    },'4n');

    const r = this.#section.region
    this.#tone.Transport.scheduleOnce((t)=>{
      this.players.forEach((p)=>{
        p.loopStart = r[0]+'m';
        p.loopEnd = r[1]+'m';
        p.loop = true;
        p.start(t,r[0]+'m');
      })
    },0)

    this.#tone.Transport.start('+0.1s')

    this.state = 'started'
    if(this.#verbose) console.log("JSONAudio player started")
  }

  stop(){
    if(this.state === 'stopped') return
    this.#tone.Transport.stop()
    this.#tone.Transport.cancel()
    this.#tone.Transport.clear()
    this.players.forEach((p)=>{
      p.stop('@4n')
    })

    this.state = 'stopped'
    if(this.#verbose) console.log("JSONAudio player stopped")
  }

  next(force = false){
    const grain = this.#section.grain;
    const meterDenominator = this.#tone.Transport.timeSignature
    const nextTime = QuanTime(this.#tone.Transport.position, [grain, meterDenominator])
    console.log(nextTime)
    this.#tone.Transport.scheduleOnce((t)=>{
      this.nextSection(force)
      const r = this.#section.region
      this.players.forEach((p)=>{
        p.loopStart = r[0]+'m';
        p.loopEnd = r[1]+'m';
        p.loop = true;
        p.start(t,r[0]+'m');
      })
      console.log(this.playingNow)
    },nextTime)
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
      targetRepeats: isSubloop ? (finiteRepeat ? curSection[0] : Infinity) : 0,
      grain: this.#manifest.playback.grain,
      ...this.#manifest.playback.map[sectionName]
    }
    if(this.#verbose) console.log(index, _subIndex, sectionName, {...this.#section})
  }

  nextSection(breakOut = false){
    const normalAdvance = ()=>{
      this.setSection(this.#section.flowIndex + 1)
      if(this.#section.isSubloop) {
        this.#sectionRepeats = this.#section.targetRepeats 
        if(this.#verbose) console.log(`Enter subloop: remaining loops: ${this.#sectionRepeats}`)
      }
    }
    const subAdvance = ()=>{
      this.setSection(this.#section.flowIndex, this.#section.subIndex + 1)
    }

    if(this.#section?.isSubloop && !breakOut){
      subAdvance()
      if(this.#section.subIndex === 0){
        this.#sectionRepeats -= 1
        if(this.#verbose) console.log(`Subloop Looped, remaining loops: ${this.#sectionRepeats}`)
        if(this.#sectionRepeats === 0){
          if(this.#verbose) console.log("Exit Subloop")
          normalAdvance()
        }
      }
    }
    else{
      if(breakOut && this.#verbose) console.log("Break out of Subloop")
      normalAdvance()
    }
  }

  rampTrackVolume(trackIndex, db, inTime = 0, sync = true){
    if(!this.state) return
    this.players[trackIndex].volume.rampTo(db,inTime, sync ? '@4n' : undefined)
  }

  constructor(tone, data = null, verbose = false){
    this.#tone = tone;
    this.#verbose = verbose
    this.state = null;
    if(data) this.parse(data)
  }
}

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
/*
function QuanTime(nowTime, atBeats, barBeats){
  const units = nowTime.split(':')
  const nowBar = parseInt(units[0])
  const nowBeat = parseInt(units[1])

  const quantize = (v,q)=>Math.floor((v + q)/q)*q;

  if(atBeats < barBeats){
    const adv =  quantize(nowBeat,atBeats)
    const nextBeat = adv%barBeats
    const nextBar = nowBar + Math.floor(adv/barBeats)
    return `${nextBar}:${nextBeat}:0`
  }

  const adv = atBeats/barBeats
  return `${quantize(nowBar,adv)}:0:0`
}
*/
module.exports = {JSONPlayer, QuanTime}