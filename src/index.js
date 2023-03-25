import "./styles.css";
import * as Tone from "tone";

import song from './manifest.json'

const osc = new Tone.Synth().toDestination();
const audioButton = document.getElementById("audio");
audioButton.addEventListener("click", () => {
  Tone.start();
  osc.triggerAttackRelease("c4", "4n");
});


const playButton = document.getElementById("play");
function parseSong(manifest){
  const players = []
  for(const track of manifest.tracks){
    console.log(track)
    const p = new Tone.Player(track.source).toDestination()
    players.push(p)
  }

  return {
    players,
    start: ()=>{
      players.forEach((p)=>{
        p.start()
      })
    }
  }
}

const player = parseSong(song)
playButton.addEventListener("click", () => {
  player.start()
});
