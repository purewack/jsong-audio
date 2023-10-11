import "./styles.css";
import * as Tone from "tone";
import interact from 'interactjs' ;
import JSONgPlayer from "./JSONgPlayer";

const audioButton = document.getElementById("audio");
audioButton.addEventListener("click", () => {
  Tone.start();
});

const loaderLabel = document.getElementById("loader");
loaderLabel.innerText = 'Loading...'

const player = new JSONgPlayer(Tone)

player.parse('short_song').then((full)=>{
  loaderLabel.innerText = full ? 'Ready' : 'Partial Load'
}).catch((reason, data)=>{
  if(reason === 'loading')
    loaderLabel.innerText = 'Error loading audio files'
  else if(reason === 'manifest') {
    loaderLabel.innerText = 'Error parsing .jsong file'
  }
})

const timeline = document.getElementById("timeline")
player.onSongTransport = (pos)=>{
  timeline.innerText = pos;
}

const queue = document.getElementById("queue")
player.onRegionStart = (region)=>{
  console.log(region)
  queue.innerText = 'onRegionStart ' + region
}

document.getElementById("play").addEventListener("click", () => {
  Tone.start();
  player.start()
});
document.getElementById("stop").addEventListener("click", () => {
  player.stop()
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