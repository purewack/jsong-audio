import { getNestedIndex } from "./nestedIndex"

export default function getLoopCount(flows: SectionType, index: NestedIndex) 
: (number | undefined) {
    const loopIndex = [...index]
    loopIndex[loopIndex.length-1] = 'loop'
    return (getNestedIndex(flows,loopIndex) as number)
}