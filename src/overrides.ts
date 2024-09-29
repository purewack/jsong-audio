import _ from "lodash"
import { JSONgFlowInstruction } from "./types/jsong"

//Extraction of flow directives
export function splitSectionName(name: string): JSONgFlowInstruction { 
    const k = name.split('-')
    const extra = k.length > 1
    return {
        name: k[0],
        fade: extra ? _.includes(k, 'X') || _.includes(k, 'x') : undefined,
        once: extra ? _.includes(k, '>') : undefined,
        legato: extra ? _.includes(k, '|') : undefined,
    }
}
