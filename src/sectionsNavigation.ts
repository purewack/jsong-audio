import {PlayerIndex, PlayerSection, PlayerSectionGroup} from './types/player'
import { getNestedIndex, setNestedIndex } from './util/nestedIndex'
import { NestedIndex } from './types/common'
import { Player, start } from 'tone'

export function getNextSectionIndex(
  sections: PlayerSectionGroup,
  from: PlayerIndex,
)  {
  const section = getNestedIndex(sections, from) as PlayerSection
  if(section === undefined) return undefined

  const increments: PlayerIndex[] = []
  let next: PlayerIndex = []

  const findRootStart = (depth: PlayerIndex): PlayerIndex =>{    
    const levelCheck = getNestedIndex(sections, depth)
    if(levelCheck?.name) return depth
    return findRootStart([...depth, 0])
  }

  const checkGroup = (index: PlayerIndex) =>{
    const thisGroupIndex = [...index.slice(0,-1)]
    const groupInfo = getIndexInfo(sections, index) as PlayerSectionGroup
    const isGroupLast = index.at(-1)! + 1 >= groupInfo.sectionCount
    const willGroupLoop = groupInfo.loopCurrent + 1 >= groupInfo.loopLimit

    if(isGroupLast) 
      increments.push(thisGroupIndex)

    //last and will loop 
    if(isGroupLast && willGroupLoop){
      //need to check lower groups
      checkGroup(thisGroupIndex)
      return
    }

    //last but will not exit loop, still need to increment counter
    if(isGroupLast){
      next = findRootStart([...thisGroupIndex,0])
      return
    }
    //normal advancement
    else {
      next = findRootStart([...thisGroupIndex,index.at(-1)! + 1])
      return
    }
  }

  checkGroup(from)
  return {next, increments}
}


export function findStart(sections: PlayerSectionGroup): PlayerIndex{
  let current = sections;
  let deepestIndex = [-1];

  while (current && current[0]) {
      if (current[0].hasOwnProperty('index')) {
          deepestIndex = (current[0] as PlayerSection).index;
      }
      current = current[0] as PlayerSectionGroup;
  }

  return deepestIndex;
}


export function getIndexInfo(sections: any, index: NestedIndex) 
: (any | undefined) {
  // const check = getNestedIndex(sections, index)
  // if(check?.sectionCount)
  //   return {...check}

  if(index.length && index.length > 1) {
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