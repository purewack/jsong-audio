import { PlayerSectionOverrides } from "./types/player"
import _ from "lodash"

//Extraction of flow directives
export function splitSectionName(name: string): {name: string, flags?: PlayerSectionOverrides} { 
    const k = name.split('-')
    return {
        name: k[0],
        flags: k.length > 1 ? {
            fade: _.includes(k, 'X') || _.includes(k, 'x'),
            once: _.includes(k, '>'),
        } : undefined
    }
}
