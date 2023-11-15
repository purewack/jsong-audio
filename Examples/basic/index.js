import JSONg from "jsong";

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
songLoad('test_song')


const state = document.getElementById("state")
player.onStateChange = (st)=>{
  console.log(st)
  state.innerText = "State:" + st
}

const timeline = document.getElementById("timeline")
player.onTransport = (song, section)=>{
  timeline.innerText = `T: ${song} [${section[0]}/${section[1]}]`;
}
const ntimeline = document.getElementById("ntimeline")
  
const playbutton = document.getElementById("play")
playbutton.onclick = (ev) => {
  if(ev.target.innerText === 'Play')
    player.play()
  else
    player.cancel()
};

document.getElementById("stop").addEventListener("click", () => {
  player.stop()
});

document.getElementById("intro").addEventListener("click", () => {
  player.skipTo([0])
});
document.getElementById("from").addEventListener("click", () => {
  player.skipTo([1])
});

document.getElementById("offgrid").addEventListener("click", () => {
  player.skipOffGrid();
});
document.getElementById("skip").addEventListener("click", () => {
  player.skip();
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

player.onSectionPlayStart = (index)=>{ 
  queue.innerText = 'Now Playing: ' + index
  playbutton.innerText = 'Play'
}
player.onSectionPlayEnd = (index)=>{
  squeue.innerText = 'Has Ended: ' + index
}
player.onSectionWillEnd = (index)=>{
  if(!index) squeue.innerText = 'cancelled'
  squeue.innerText = 'Will End: ' + index
}

player.onSectionWillStart = (index, flags, when)=>{
  if(!index) {
    squeue.innerText = 'Cancelled'
    playbutton.innerText = 'Play'
  }
  else{
    queue.innerText = 'Will Play: ' + index
    ntimeline.innerText = 'NextT:' + when;
    playbutton.innerText = 'Cancel'
  }
}

player.onSectionCancelChange = (index, flags, when)=>{
  ntimeline.innerText = 'NextT:' + when;
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
