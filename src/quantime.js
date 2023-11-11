function quanTime(nowPosition, atBeats = 4, meter = [4,4], lastStartAlignPosition = undefined){
  const splitTime = (position)=>position.split(':').map(n => parseInt(n))
  const quantize = (unit,q)=>Math.trunc((unit + q)/q)*q;

  const barBeats = meter[0] / (meter[1]/4)
  const [nowBar, nowBeat] = splitTime(nowPosition)
  // console.log('begin', barBeats, nowBar, nowBeat)

  //if align is less than bar length
  if(atBeats < barBeats){
    const adv =  quantize(nowBeat,atBeats)
    const nextBeat = adv%barBeats
    const nextBar = nowBar + Math.trunc(adv/barBeats)

    // console.log('less',adv, barBeats)
    return `${nextBar}:${nextBeat}:0`
  }
  else {
    //bar times, adhere to gridAlign
    const adv = atBeats/barBeats
    if(lastStartAlignPosition !== undefined 
    && lastStartAlignPosition !== null) {
      // console.log('more grid pre',adv ,nowBar, nowBeat)
      //take the quantization back from last gridAlignStart time
      if(typeof lastStartAlignPosition === 'string'){
        //TODO: change from while loop to more efficient calculation
        let nextGridBar = splitTime(lastStartAlignPosition)[0];
        // console.log('more grid',adv, nextGridBar)
        while(nextGridBar <= nowBar) nextGridBar += adv;
        return `${nextGridBar}:0:0`
      }
      return `${quantize(nowBar,adv) + lastStartAlignPosition}:0:0`
    }
    // console.log('more',adv ,nowBar, nowBeat)
    return `${nowBar + adv}:0:0`
  }
}

module.exports = {quanTime}


// 3:0:0
// 16 = 4bar
// now = 22:0:0
// next = 23:0:0