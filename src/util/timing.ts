import { BarsBeatsSixteenths } from "tone/build/esm/core/type/Units";

export function quanTime(
  nowPosition: string, 
  atBeats: number = 4, 
  meter: number[] = [4,4], 
  lastStartAlignPosition?: string | number
): string 
{
  const splitTime = (position: string)=>position.split(':').map(n => parseInt(n))
  const quantize = (unit: number,q: number)=>Math.trunc((unit + q)/q)*q;

  const barBeats = meter[0] / (meter[1] / 4)
  const [nowBar, nowBeat] = splitTime(nowPosition)
  atBeats = atBeats / (meter[1] / 4)
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

export function beatTransportDelta(from: BarsBeatsSixteenths, to:BarsBeatsSixteenths, meter: [number,number]){

  const beatUnit = (meter[1] / 4)
  const beatsPerBar = meter[0] / beatUnit

  // Convert time codes to arrays of numbers
  const [bar1, beat1, sixteenth1] = from.split(':').map(Number);
  const [bar2, beat2, sixteenth2] = to.split(':').map(Number);

  // Calculate total beats for each time code
  const totalBeats1 = bar1 * beatsPerBar + beat1 + sixteenth1 / (16 / beatUnit);
  const totalBeats2 = bar2 * beatsPerBar + beat2 + sixteenth2 / (16 / beatUnit);

  const result = (totalBeats2 - totalBeats1) * beatUnit
  // Return the absolute difference in beats
  return Math.round(result)
}