import {PlayerIndex, PlayerSection, PlayerSections} from './types/player'
import { getNestedIndex, setNestedIndex } from './util/nestedIndex'
import { NestedIndex } from './types/common'
import { Player, start } from 'tone'

export function getNextSectionIndex(
  sections: PlayerSections,
  from: PlayerIndex,
)  {

  const section = getNestedIndex(sections, from) as PlayerSection
  if(section === undefined) return undefined

  let checkInfo = getIndexInfo(sections,section.index) as PlayerSections

  //normal case to jump to next entry in a group that is not the last one
  //or shallow root level group advancement
  if(section.index.length === 1 || section.index.at(-1) !== checkInfo.sectionCount-1) 
    return {next: section.next, increments:[], pre:true, root: section.index.length === 1}
  

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


  /*
  [[A,AA], B]
  
    (0,0):    A
    (0,1):    AA
    (1):    B
  */
 
  //scan current group

  //if(loop counter is overflown)
  //  check(level[:-1])
  //else
  //  findStart(level)

  //[[A,B],[D,[E]]]
  //transition from E should return A if E's group is looped as well as D's

  const increments: PlayerIndex[] = []


  const findRootStart = (depth: PlayerIndex): PlayerIndex =>{    
    const levelCheck = getNestedIndex(sections, depth)
    if(levelCheck?.name) return depth
    return findRootStart([...depth, 0])
  }


  const checkLevel = (index: PlayerIndex): PlayerIndex =>{
    const levelInfo = getIndexInfo(sections, index) as PlayerSections

    console.log("group ",index, levelInfo)

    if(index.at(-1)! + 1 >= levelInfo.sectionCount){
      console.log("group end",index)
      //reached end of group

      if(levelInfo.loopCurrent + 1 >= levelInfo.loopLimit){
        //will loop group level
        const preLevel = [...index.slice(0,-1)]
        increments.push(preLevel

        )
        console.log("loop",increments)
        // if(index.length === 1){
        //   //root reached, edge case, 
        //   //cannot go any lower, need to start finding start
        //   return findRootStart([0])
        // }
        
        const upperIndexStart = [...preLevel.slice(0,-1),preLevel.at(-1)! + 1]
        //check next group
        console.log("post",preLevel,upperIndexStart)
        return checkLevel(upperIndexStart)
      }
    
      // //no loop present
      // // return findRootStart([...index.slice(0,-1),0])
      // return index
    }
    
    console.log("group normal advance",index)
    //this advancement does not exit group, normal next
    return index
  }

  console.warn("Start",sections,from)
  return {next: checkLevel(from), increments}
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