import { NestedIndex } from './types/common';
import {SectionData, SectionInfo} from './types/player'
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

export default function getNextSectionIndex(
  topLevel: SectionInfo,
  from: NestedIndex,
  breakLoop: boolean = false,
) : (NestedIndex | undefined) {
  
  const levelInfo = getIndexInfo(topLevel, from) as SectionInfo
  if(levelInfo?.sectionCount === undefined) return undefined

  const idxOnLevel = from[from.length - 1] as number
  const sec = levelInfo[idxOnLevel as number] as SectionData

  if(breakLoop || idxOnLevel + 1 <= levelInfo.sectionCount-1)
    return sec.next
  else{
    const deepCheck = (depth: NestedIndex) 
    : (NestedIndex | undefined) =>{    
      const levelCheck = getNestedIndex(topLevel, depth)
      if(levelCheck?.name) return depth
      return deepCheck([...depth, 0])
    }
    return deepCheck([...from.slice(0,-1),0])
  }
}
