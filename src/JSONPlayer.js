import * as Tone from "tone";

export 
class JSONPlayer {

  parse(data){
    this.manifest = structuredClone(data)
    const players = []
    for(const track of this.manifest.tracks){
      if(this.verbose) console.log(track)
      const player = new Tone.Player(track.source).toDestination()
      player.volume.value = track.volumeDB
      players.push(player)
    }
    this.players = players

    this.metronome = new Tone.Synth().toDestination()
    this.metronome.envelope.attack = 0;
    this.metronome.envelope.release = 0.05;
    this.metronome.volume.value = -12;

    Tone.Transport.bpm.value = this.manifest.bpm
    Tone.Transport.timeSignature = this.manifest.meter

    this.stop()
  }

  start(){
    const r = this.section.section.region
    
    this.players.forEach((p)=>{
      p.loopStart = r[0]+'m'
      p.loopEnd = r[1]+'m'
      p.loop = true
    })

    Tone.Transport.scheduleOnce((t)=>{
      this.players.forEach((p)=>{
        p.start(t,r[0]+'m')
      })
    },'0:0:0')

    Tone.Transport.scheduleRepeat((t)=>{
      this.metronome.triggerAttackRelease('b6','32n',t);
    },'4n');

    Tone.Transport.start('+0.1s')
    this.state = 'started'
    if(this.verbose) console.log("JSONAudio player started")
  }

  stop(){
    this.state = 'stopped'
    if(this.verbose) console.log("JSONAudio player stopped")
    
    const startSection = 'chorus'//this.manifest.playback.flow[0]
    this.section = {
        name: startSection,
        section: this.manifest.playback.map[startSection]
    }
    
    Tone.Transport.stop()
    Tone.Transport.cancel()
    this.players.forEach((p)=>{
      p.stop()
    })
  }

  next(asap){

  }

  queue(){

  }

  constructor(data, verbose){
    this.verbose = verbose
    this.parse(data)
  }
}
