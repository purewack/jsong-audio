import "./styles.css";
import {JSONg} from "jsong";

const loaderLabel = document.getElementById("loader");
loaderLabel.innerText = 'Loading...'

const player = new JSONg(true)


const songLoad = (song)=>{
player.parse(song + '/audio.jsong', song).then((full)=>{
  loaderLabel.innerText = full ? 'Ready' : 'Partial Load'
}).catch((reason, data)=>{
  if(reason === 'loading')
    loaderLabel.innerText = 'Error loading audio files'
  else if(reason === 'manifest') {
    loaderLabel.innerText = 'Error parsing .jsong file'
  }
})
}
songLoad('test_song2')

const state = document.getElementById("state")
player.onStateChange = (st)=>{
  console.log(st)
  state.innerText = st
}

const timeline = document.getElementById("timeline")
player.onTransport = (song, section)=>{
  timeline.innerText = `${song} [${section[0]}/${section[1]}]`;
}
const ntimeline = document.getElementById("ntimeline")
  
const playbutton = document.getElementById("play")
playbutton.onclick = (ev) => {
  if(ev.target.innerText === 'Play')
    player.play()
  else
    player.cancel()
};
document.getElementById("intro").addEventListener("click", () => {
  player.advanceSection([0])
});
document.getElementById("from").addEventListener("click", () => {
  Tone.start();
  player.play([1], true, 0)
});
document.getElementById("skip").addEventListener("click", () => {
  player.play(null, true)
});
document.getElementById("stop").addEventListener("click", () => {
  player.stop()
});

document.getElementById("xa").addEventListener("click", () => {
  player.crossFadeTracks(['bass'],['guitar'],'1m');
});
document.getElementById("xb").addEventListener("click", () => {
  player.crossFadeTracks(['guitar'],['bass'],'1m');
});


player.onSectionRepeat = (index, reps)=>{ 
  document.getElementById("reps").innerText = JSON.stringify(index) + ' ' + reps
}

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

const onPlayerForceSection = (index)=>{
  console.log('switch to section', index)
  if(player.state === 'started')
  player.advanceSection(index)
}

const isObservingCallback = (entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('Intersect')
      const s = entry.target.dataset?.forceSection
      if(s){
        onPlayerForceSection(JSON.parse(s))
      }
    }
  });
}

const observer100 = new IntersectionObserver(isObservingCallback, {
  root: document.body,
  rootMargin: '0px',
  threshold: 1.0,
});
const observer50 = new IntersectionObserver(isObservingCallback, {
  root: document.body,
  rootMargin: '0px',
  threshold: 0.5,
});

document.querySelectorAll('.scrollTrigger').forEach(t=>{
  observer50.observe(t)
});
