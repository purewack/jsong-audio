import {PlayerIndex, PlayerSection, PlayerSections} from './types/player'
import { getNestedIndex, setNestedIndex } from './util/nestedIndex'
import { NestedIndex } from './types/common'
import { start } from 'tone'

export function getNextSectionIndex(
  sections: PlayerSections,
  from: PlayerIndex,
  breakLoop: boolean = false,
)  {

  //A, [B, [C,D], E] 
  const section = getNestedIndex(sections, from) as PlayerSection
  if(section === undefined) return undefined

  const deepExit = section.index.length - section.next.length > 1
  if(breakLoop || !deepExit) return section.next

  //edge case for more than one right aligned nested group set
  //A, [B, [C,D]] 
  
  /*
  [A, [B, [BB, [C,D]]], E]

    (0):        A 
    (1,0):        B 
    (1,1,0):        BB 
    (1,1,1,0):         C
    (1,1,1,1):         D 
    (2):        E 
  */
 
  let startPoint = [...section.index]
  let endPoint = section.next
  while(startPoint.length > 1){
    const checkSection = getNestedIndex(sections,startPoint)
    const checkInfo = getIndexInfo(sections,startPoint) as PlayerSections
    if(checkInfo.loopCurrent + 1 >= checkInfo.loopLimit){
      startPoint = [...startPoint.slice(0,-1)]
      continue
    }
    else  
      return [...startPoint.slice(0,-1), 0]
  }
  return endPoint
}

export function repeatMarkerCheck(section:PlayerSection)
{
  const enterLoop = section.next.length > section.index.length
  const exitLoop = section.next.length < section.index.length
  return {enterLoop, exitLoop}
  
  // const startFrom = from instanceof Array ? from : from.index
  // const levelInfo = getIndexInfo(sections, startFrom) as PlayerSections
  // if(levelInfo?.sectionCount === undefined) return false
  // const idxOnLevel = startFrom[startFrom.length - 1] as number
  // return (idxOnLevel + 1 > levelInfo.sectionCount-1)
}

export function findStart(sections: PlayerSections): PlayerIndex{
  let current = sections;
  let deepestIndex = [-1];

  while (current && current[0]) {
      if (current[0].hasOwnProperty('index')) {
          deepestIndex = (current[0] as PlayerSection).index;
      }
      current = current[0] as PlayerSections;
  }

  return deepestIndex;
}


export function getIndexInfo(sections: any, index: NestedIndex) 
: (any | undefined) {
    if(index.length > 1) {
        return {...getNestedIndex(sections, index.slice(0,-1))}
    }
    else{
        return {...sections}
    }
}

export function setIndexInfo(toSet: object, sections: any, index: NestedIndex){
    const n = {...sections}
    const i = [...index]
    if(i.length > 1) {
        i.pop()
        const e = {...getNestedIndex(n,i), ...toSet}
        setNestedIndex(e,n,i)
    }
}