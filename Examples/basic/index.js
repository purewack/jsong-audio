import "./styles.css";
import * as Tone from "tone";
import interact from 'interactjs' ;
import { JSONPlayer } from "./JSONPlayer";
import song from './static/testsong.audio.json';

const audioButton = document.getElementById("audio");
audioButton.addEventListener("click", () => {
  Tone.start();
});

const loaderLabel = document.getElementById("loader");
loaderLabel.innerText = 'Loading...'
const player = new JSONPlayer(Tone)
player.setVerbose(true)
player.parse(song).then((full)=>{
  loaderLabel.innerText = full ? 'Ready' : 'Partial Load'
}).catch((reason, data)=>{
  if(reason === 'loading')
    loaderLabel.innerText = 'Error loading audio files'
  else if(reason === 'manifest') {
    loaderLabel.innerText = 'Error parsing file'
  }
})

const queue = document.getElementById("queue")
player.onRegionStart = (region)=>{
  queue.innerText = 'onRegionStart ' + region
}

const show = ()=>{
  console.log({...Tone.Transport._timeline._timeline})
}

document.getElementById("play").addEventListener("click", () => {
  Tone.start();
  player.start()
  show()
});
document.getElementById("stop").addEventListener("click", () => {
  player.stop()
  show()
});
document.getElementById("next").addEventListener("click", () => {
  player.next()
});
document.getElementById("nextForce").addEventListener("click", () => {
  player.next(true)
});
document.getElementById("verse1").addEventListener("click", () => {
  player.next(true, 'verse1')
});

const timeline = document.getElementById("timeline")

setInterval(()=>{
  timeline.innerText = Tone.Transport.position;
},1000)


const position = { x: 0, y: 0 }
interact('.handle').draggable({
  listeners: {
    // start (event) {
    //   console.log(event.type, event.target)
    // },
    move (event) {
      position.x += event.dx
      position.y += event.dy
      if(position.x < 0) position.x = 0
      if(position.y < 0) position.y = 0

      const ratio = Math.min(1.0, position.x / 300)
      const db = 20*Math.log10(ratio)
      player.rampTrackVolume(0,db)

      event.target.style.transform =
        `translate(${position.x}px, ${position.y}px)`
    },
  }
})