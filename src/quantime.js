function quanTime(nowTime, meterInfo = [4,4], gridAlignStart = undefined){
  const [atBeats, barBeats] = meterInfo
  const units = nowTime.split(':')
  const nowBar = parseInt(units[0])
  const nowBeat = parseInt(units[1])

  const quantize = (unit,q)=>Math.trunc((unit + q)/q)*q;

  //if align is less than bar length
  if(atBeats < barBeats){
    const adv =  quantize(nowBeat,atBeats)
    const nextBeat = adv%barBeats
    const nextBar = nowBar + Math.trunc(adv/barBeats)
    return `${nextBar}:${nextBeat}:0`
  }
  else {
    //bar times, adhere to gridAlign
    const adv = atBeats/barBeats
    if(gridAlignStart !== undefined){
      return `${quantize(nowBar,adv) + gridAlignStart}:0:0`
    }
    return `${nowBar + adv}:0:0`
  }
}

module.exports = {quanTime}