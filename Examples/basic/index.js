import "./styles.css";
import * as Tone from "tone";
import interact from 'interactjs' ;
// import {JSONg} from "jsong";
import {JSONg} from "./JSONg"

const audioButton = document.getElementById("audio");
audioButton.addEventListener("click", () => {
  Tone.start();
});

const loaderLabel = document.getElementById("loader");
loaderLabel.innerText = 'Loading...'

const player = new JSONg(Tone)

player.parse('test_song').then((full)=>{
  loaderLabel.innerText = full ? 'Ready' : 'Partial Load'
}).catch((reason, data)=>{
  if(reason === 'loading')
    loaderLabel.innerText = 'Error loading audio files'
  else if(reason === 'manifest') {
    loaderLabel.innerText = 'Error parsing .jsong file'
  }
})


const state = document.getElementById("state")
player.onStateChange = (st)=>{
  state.innerText = st
}

const timeline = document.getElementById("timeline")
player.onSongTransport = (pos)=>{
  timeline.innerText = pos;
}

const squeue = document.getElementById("prequeue")
const queue = document.getElementById("postqueue")
player.onSectionPlayEnd = (index)=>{
  console.log(index)
  squeue.innerText = 'ended ' + index
}
player.onSectionWillEnd = (index)=>{
  console.log(index)
  squeue.innerText = '|| ' + index
}

player.onSectionWillPlay = (index)=>{
  console.log(index)
  queue.innerText = '>> ' + index
}
player.onSectionPlayStart = (index)=>{
  console.log(index)
  queue.innerText = 'playing ' + index
}


document.getElementById("play").addEventListener("click", () => {
  Tone.start();
  player.play()
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
      player.rampTrackVolume(1,db)

      event.target.style.transform =
        `translate(${position.x}px, ${position.y}px)`
    },
  }
})