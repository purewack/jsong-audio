import { NestedIndex } from "./types/common"
import { getNestedIndex, setNestedIndex } from "./nestedIndex"
import {PlayerSections} from "./types/player"

export function getIndexInfo(sections: any, index: NestedIndex) 
: (any | undefined) {
    if(index.length > 1) {
        return {...getNestedIndex(sections, index.slice(0,-1))}
    }
    else{
        return {...sections}
    }
}

export function setIndexInfo(toSet: object, sections: any, index: NestedIndex)
: (any | undefined) {
    const n = {...sections}
    if(index.length > 1) {
        index.pop()
        const e = {...getNestedIndex(n,index), ...toSet}
        setNestedIndex(e,n,index)
        return n
    }
    else{
        return {...sections, ...toSet}
    }
}