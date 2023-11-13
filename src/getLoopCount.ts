import { getNestedIndex } from "./nestedIndex"
import { NestedIndex, NestedType, SectionType } from "./types"

export default function getLoopCount(flows: SectionType, index: NestedIndex) 
: (NestedType | undefined) {
    const loopIndex = [...index]
    loopIndex[loopIndex.length-1] = 'loop'
    return getNestedIndex(flows,loopIndex)
}