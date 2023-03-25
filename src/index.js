import "./styles.css";
import * as Tone from "tone";

import song from './manifest.json'

const osc = new Tone.Synth().toDestination();
const audioButton = document.getElementById("audio");
audioButton.addEventListener("click", () => {
  Tone.start();
  osc.triggerAttackRelease("c4", "4n");
});


class JSONPlayer {

  parse(data){
    this.manifest = structuredClone(data)
    const players = []
    for(const track of this.manifest.tracks){
      console.log(track)
      const player = new Tone.Player(track.source).toDestination()
      player.volume.value = track.volumeDB
      players.push(player)
    }
    this.players = players
  }

  start(){
    this.players.forEach((p)=>{
      p.start()
    })
  }

  constructor(data, verbose){
    this.parse(data)
    if(verbose) console.log(this)
  }
}

const player = new JSONPlayer(song, true)
const playButton = document.getElementById("play");
playButton.addEventListener("click", () => {
  player.start()
});
