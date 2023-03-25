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

}

// const player = parseSong(song)
// playButton.addEventListener("click", () => {
//   player.start()
// });
