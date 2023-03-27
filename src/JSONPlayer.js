import * as Tone from "tone";

export 
class JSONPlayer {

  #verbose;
  #manifest;
  #section;
  playingNow;

  #metronome;
  metronomeNote = 'b6';

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
    this.#metronome.volume.value = -12;

    Tone.Transport.bpm.value = this.#manifest.playback.bpm
    Tone.Transport.timeSignature = this.#manifest.playback.meter

    this.#updateSectionFlow(0)
    this.stop()
  }

  start(){
    if(this.state === 'started') return

    Tone.Transport.scheduleRepeat((t)=>{
      this.#metronome.triggerAttackRelease(this.metronomeNote,'32n',t);
    },'4n');

    this.#updateSectionFlow(0)
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
      p.stop()
    })

    this.state = 'stopped'
    if(this.#verbose) console.log("JSONAudio player stopped")
  }

  next(){
    const nextTime = this.nextQuanTransportTime()
    const nextSection = this.#section.flowIndex + 1
    Tone.Transport.scheduleOnce((t)=>{
      this.#updateSectionFlow(nextSection)
      this.playingNow = {section: this.#section.name}
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

  #updateSectionFlow(index){
    const startSection = this.#manifest.playback.flow[index]
    this.#section = {
        name: startSection,
        flowIndex: index,
        queueId: null,
        ...this.#manifest.playback.map[startSection]
    }
    if(this.#verbose) console.log(this.#section)
  }

  nextQuanTransportTime(){
    const grain = this.#section.grain ? this.#section.grain : this.#manifest.playback.grain
    const meterDenominator = Tone.Transport.timeSignature
    return QuanTime(Tone.Transport.position, grain, meterDenominator)
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