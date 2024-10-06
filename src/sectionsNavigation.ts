import {PlayerIndex, PlayerSection, PlayerSections} from './types/player'
import { getNestedIndex, setNestedIndex } from './util/nestedIndex'
import { NestedIndex } from './types/common'

/*{
  0: {
    0: {
      0: [1,0,0],
      1: [1,0,1],
    },
    1: [1,1],
    2: {
      0: [1,2,0],
      1: [1,2,1],
    },
    3: [0,3]
  },
  1: [1],
}*/

export function getNextSectionIndex(
  sections: PlayerSections,
  from: PlayerSection | PlayerIndex,
  breakLoop: boolean = false,
) : (PlayerIndex | undefined) {

  const startFrom = from instanceof Array ? from : from.index
  const levelInfo = getIndexInfo(sections, startFrom) as PlayerSections
  if(levelInfo?.sectionCount === undefined) return undefined

  const idxOnLevel = startFrom[startFrom.length - 1] as number
  const sec = levelInfo[idxOnLevel as number] as PlayerSection

  if(breakLoop || idxOnLevel + 1 <= levelInfo.sectionCount-1){
    return sec.next
  }
  else{
    const deepCheck = (depth: PlayerIndex) 
    : PlayerIndex =>{    
      const levelCheck = getNestedIndex(sections, depth)
      if(levelCheck?.name) return depth
      return deepCheck([...depth, 0])
    }
    return deepCheck([...startFrom.slice(0,-1),0])
  }
}

export function isRepeatEndpoint(
  sections: PlayerSections, 
  from:PlayerSection | PlayerIndex)
{
  // const section = getNestedIndex(sections, from instanceof Array ? from : from.index) as PlayerSection
  // return section && section.next.length < section.index.length
  const startFrom = from instanceof Array ? from : from.index
  const levelInfo = getIndexInfo(sections, startFrom) as PlayerSections
  if(levelInfo?.sectionCount === undefined) return false
  const idxOnLevel = startFrom[startFrom.length - 1] as number
  return (idxOnLevel + 1 > levelInfo.sectionCount-1)
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