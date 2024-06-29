import { PlayerSectionOverrides } from "./types/player"
import _ from "lodash"

//Extraction of flow directives
export function parseFlowOverrides(name: string): {name: string, flags?: PlayerSectionOverrides} { 
    const k = name.split('-')
    return {
        name: k[0],
        flags: k.length > 1 ? {
            fade: _.includes(k, 'X') || _.includes(k, 'x'),
            next: _.includes(k, '>'),
        } : undefined
    }
}