import "./styles.css";
import * as Tone from "tone";

import song from './manifest.json'

const audioButton = document.getElementById("audio");
audioButton.addEventListener("click", () => {
  Tone.start();
});

class JSONPlayer {

  parse(data, verbose){
    this.manifest = structuredClone(data)
    const players = []
    for(const track of this.manifest.tracks){
      if(verbose) console.log(track)
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
  }

  start(){
    const r = this.manifest.playback.sections[0].region
    
    Tone.Transport.scheduleOnce((t)=>{
      this.players.forEach((p)=>{
        p.start(t,r[0]+'m',r[1]+'m')
      })
    },'0:0:0')

    Tone.Transport.scheduleRepeat((t)=>{
      this.metronome.triggerAttackRelease('b6','32n',t);
    },'4n');

    Tone.Transport.start('+0.1s')
  }

  stop(){
    Tone.Transport.stop()
    Tone.Transport.cancel()
    this.players.forEach((p)=>{
      p.stop()
    })
  }

  constructor(data, verbose){
    this.parse(data, verbose)
  }
}

const player = new JSONPlayer(song, true)

const playButton = document.getElementById("play");
playButton.addEventListener("click", () => {
  player.start()
});
const stopButton = document.getElementById("stop");
stopButton.addEventListener("click", () => {
  player.stop()
});