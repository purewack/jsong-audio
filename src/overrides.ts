import _ from "lodash"
import { JSONgFlowInstruction } from "./types/jsong"

//Extraction of flow directives
export function splitSectionName(name: string) { 
    const k = name.split('-')
    const extra = k.length > 1
    const fade = extra ? _.includes(k, 'X') || _.includes(k, 'x') : undefined
     
    return {
        name: k[0],
        fade,
        once: extra ? _.includes(k, '>') : undefined,
        legato: extra ? _.includes(k, '|') && !fade : undefined,
    }
}
