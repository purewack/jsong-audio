export function quanTime(
  nowPosition: string, 
  atBeats: number = 4, 
  meter: number[] = [4,4], 
  lastStartAlignPosition?: string | number
): string 
{
  const splitTime = (position: string)=>position.split(':').map(n => parseInt(n))
  const quantize = (unit: number,q: number)=>Math.trunc((unit + q)/q)*q;

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