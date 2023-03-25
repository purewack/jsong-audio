import "./styles.css";
import * as Tone from "tone";
import { JSONPlayer } from "./JSONPlayer";
import song from './manifest.json'

const audioButton = document.getElementById("audio");
audioButton.addEventListener("click", () => {
  Tone.start();
});

const player = new JSONPlayer(song, true)

const playButton = document.getElementById("play");
playButton.addEventListener("click", () => {
  Tone.start();
  player.start()
});
const stopButton = document.getElementById("stop");
stopButton.addEventListener("click", () => {
  player.stop()
});