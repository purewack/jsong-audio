import * as Tone from "tone";
import { version } from "tone";

export class JSONPlayer {
  //version 0.0.1

  #verbose;
  #manifest;
  #section;
  #sectionRepeats;
  playingNow;

  #metronome;
  #meterBeat;

  parse(data){
    this.#manifest = structuredClone(data)
    const players = []
    for(const track of this.#manifest.tracks){
      if(this.#verbose) console.log(track)
      const player = new Tone.Player(track.source).toDestination()
      player.volume.value = track.volumeDB
      players.push(player)
    }
    this.players = players

    this.#metronome = new Tone.Synth().toDestination()
    this.#metronome.envelope.attack = 0;
    this.#metronome.envelope.release = 0.05;
    this.#metronome.volume.value = this.#manifest.playback.metronomeDB || 0;
    this.#meterBeat = 0;

    Tone.Transport.bpm.value = this.#manifest.playback.bpm
    Tone.Transport.timeSignature = this.#manifest.playback.meter

    this.playingNow = null;
    this.playingQueue = null;
    this.#sectionRepeats = 0
    this.setSection(0)
    this.stop()
  }

  start(){
    if(this.state === 'started') return

    if(this.#manifest.playback.metronome)
    Tone.Transport.scheduleRepeat((t)=>{
      const note = this.#manifest.playback.metronome[this.#meterBeat === 0 ? 0 : 1]
      this.#metronome.triggerAttackRelease(note,'32n',t);
      this.#meterBeat = (this.#meterBeat + 1) % Tone.Transport.timeSignature
    },'4n');

    const r = this.#section.region
    Tone.Transport.scheduleOnce((t)=>{
      this.players.forEach((p)=>{
        p.loopStart = r[0]+'m';
        p.loopEnd = r[1]+'m';
        p.loop = true;
        p.start(t,r[0]+'m');
      })
    },0)

    Tone.Transport.start('+0.1s')

    this.state = 'started'
    if(this.#verbose) console.log("JSONAudio player started")
  }

  stop(){
    if(this.state === 'stopped') return
    Tone.Transport.stop()
    Tone.Transport.cancel()
    Tone.Transport.clear()
    this.players.forEach((p)=>{
      p.stop('@4n')
    })

    this.state = 'stopped'
    if(this.#verbose) console.log("JSONAudio player stopped")
  }

  next(force = false){
    const grain = this.#section.grain;
    const meterDenominator = Tone.Transport.timeSignature
    const nextTime = QuanTime(Tone.Transport.position, grain, meterDenominator)
    console.log(nextTime)
    Tone.Transport.scheduleOnce((t)=>{
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
    this.players[trackIndex].volume.rampTo(db,inTime, sync ? '@4n' : undefined)
  }

  constructor(data = null, verbose = false){
    this.#verbose = verbose
    if(data) this.parse(data)
  }
}

export function QuanTime(nowTime, atBeats, barBeats){
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