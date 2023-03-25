import "./styles.css";
import * as Tone from "tone";
import interact from 'interactjs' 
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

const position = { x: 0, y: 0 }
interact('.handle').draggable({
  listeners: {
    start (event) {
      console.log(event.type, event.target)
    },
    move (event) {
      position.x += event.dx
      position.y += event.dy

      event.target.style.transform =
        `translate(${position.x}px, ${position.y}px)`
    },
  }
})