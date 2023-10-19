const { setNestedIndex, getNestedIndex } = require("./nestedIndex");

function getLoopCount(flows, index){
    if(!(index instanceof Array)) return undefined
    const loopIndex = [...index]
    loopIndex[loopIndex.length-1] = 'loop'
    return getNestedIndex(flows,loopIndex)
}

module.exports = {getLoopCount}