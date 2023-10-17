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
player.onTransport = (song, section)=>{
  timeline.innerText = `${song} [${section[0]}/${section[1]}]`;
}
const ntimeline = document.getElementById("ntimeline")
  
const playbutton = document.getElementById("play")
playbutton.onclick = (ev) => {
  console.log(ev.target, ev.target.innerText)
  if(ev.target.innerText === 'Play')
    player.play()
  else
    player.cancel()
};

const squeue = document.getElementById("prequeue")
const queue = document.getElementById("postqueue")
player.onSectionPlayEnd = (index)=>{
  squeue.innerText = 'ended ' + index
}
player.onSectionWillEnd = (index, when)=>{
  if(!index) squeue.innerText = 'cancelled'
  squeue.innerText = '|| ' + index
}

player.onSectionWillPlay = (index, when)=>{
  if(!index) {
    squeue.innerText = 'cancelled'
    playbutton.innerText = 'Play'
  }
  else{
    queue.innerText = '>> ' + index
    ntimeline.innerText = when;
    playbutton.innerText = 'Cancel'
  }
}
player.onSectionPlayStart = (index)=>{ 
  queue.innerText = 'playing ' + index
  playbutton.innerText = 'Play'
}


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
      player.rampTrackVolume('lead',db)

      event.target.style.transform =
        `translate(${position.x}px, ${position.y}px)`
    },
  }
})