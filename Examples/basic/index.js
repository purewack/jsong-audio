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
const ntimeline = document.getElementById("ntimeline")
  

const squeue = document.getElementById("prequeue")
const queue = document.getElementById("postqueue")
player.onSectionPlayEnd = (index)=>{
  squeue.innerText = 'ended ' + index
}
player.onSectionWillEnd = (index, when)=>{
  squeue.innerText = '|| ' + index
}

player.onSectionWillPlay = (index, when)=>{
  queue.innerText = '>> ' + index
  ntimeline.innerText = when;
}
player.onSectionPlayStart = (index)=>{ 
  queue.innerText = 'playing ' + index
}


document.getElementById("play").addEventListener("click", () => {
  Tone.start();
  player.play()
});
document.getElementById("from").addEventListener("click", () => {
  Tone.start();
  player.play([1], true)
});
document.getElementById("skip").addEventListener("click", () => {
  player.play(null, true)
});
document.getElementById("stop").addEventListener("click", () => {
  player.stop()
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