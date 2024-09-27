import { FlowValue } from "./types/common";
import { PlayerFlowValue, PlayerSectionOverrides } from "./types/player"
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

export function applyFlowOverrides(flow: FlowValue): PlayerFlowValue {
    if (typeof flow === "string") {
      // Apply parseFlowOverrides to strings and return the result object
      return parseFlowOverrides(flow);
    } else if (Array.isArray(flow)) {
      // Recursively apply the function to nested arrays
      return flow.map(applyFlowOverrides);
    } else {
      // Return numbers as is
      return flow;
    }
  }
  