import {PlayerIndex, PlayerSection, PlayerSections} from './types/player'
import { getNestedIndex } from './nestedIndex'
import { getIndexInfo } from './indexInfo';

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
  topLevel: PlayerSections,
  from: PlayerSection | PlayerIndex,
  breakLoop: boolean = false,
) : (PlayerIndex | undefined) {
  
  const startFrom = from instanceof Array ? from : from.index

  const levelInfo = getIndexInfo(topLevel, startFrom) as PlayerSections
  if(levelInfo?.sectionCount === undefined) return undefined

  const idxOnLevel = startFrom[startFrom.length - 1] as number
  const sec = levelInfo[idxOnLevel as number] as PlayerSection

  if(breakLoop || idxOnLevel + 1 <= levelInfo.sectionCount-1)
    return sec.next
  else{
    const deepCheck = (depth: PlayerIndex) 
    : PlayerIndex =>{    
      const levelCheck = getNestedIndex(topLevel, depth)
      if(levelCheck?.name) return depth
      return deepCheck([...depth, 0])
    }
    return deepCheck([...startFrom.slice(0,-1),0])
  }
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
