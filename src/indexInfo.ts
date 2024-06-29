import { NestedIndex } from "./types/common"
import { getNestedIndex, setNestedIndex } from "./nestedIndex"
import {SectionInfo} from "./types/player"

export function getIndexInfo(flows: SectionInfo, index: NestedIndex) 
: (SectionInfo | undefined) {
    if(index.length > 1) {
        index.pop()
        return {...getNestedIndex(flows, index)}
    }
    else{
        return {...flows}
    }
}

export function setIndexInfo(toSet: object, flows: SectionInfo, index: NestedIndex)
: (SectionInfo | undefined) {
    const n = {...flows}
    if(index.length > 1) {
        index.pop()
        const e = {...getNestedIndex(n,index), ...toSet}
        setNestedIndex(e,n,index)
        return n
    }
    else{
        return {...flows, ...toSet}
    }
}