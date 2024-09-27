import { BarsBeatsSixteenths } from "tone/build/esm/core/type/Units";
import { JSONgSection, JSONgTrack } from "./jsong";

/**
 * Represents the possible states for a JSONg player.
 * 
 * - `null`: No media is loaded or the player is uninitialized.
 * - `"parsing"`: The player is currently parsing media information.
 * - `"loading"`: The player is currently loading media buffers.
 * - `"stopped"`: Playback has been stopped and is ready to play media.
 * - `"playing"`: The player is actively playing media.
 * - `"queue"`: A next section is queued for playback.
 * - `"next"`: The player is transitioning from 'current' to 'next' sections, if not transition time this is immediate.
 * - `"stopping"`: The player is in the process of stopping playback.
 */
export  type PlayerState = (null | "parsing" | "loading" |"stopped" | "playing" | "queue" | "next" | "stopping" )


/**
 * Used to refer to built player section for progression purposes
 */
export  type PlayerIndex = number[];

/**
 * Processed flow sections from manifest and directives expanded
 */
export type PlayerFlowValue = { name: string; flags?: PlayerSectionOverrides } | number | PlayerFlowValue[];


/**
 * Expanded boolean flags using `FlowOverrideFlags`
 */
export  type PlayerSectionOverrides = { 
    fade: boolean;
    next?: boolean;
} | { 
    fade?: boolean;
    next: boolean;
}






/**
 * Full section information
 * Describes either the current section or scheduled sections for referencing outside the player
 */
export type PlayerSection = {
    name: string, 
    index: PlayerIndex, 
    next: PlayerIndex, 
    overrides?: PlayerSectionOverrides
} & JSONgSection;

/**
 * This is an extension of a nested type where it specifically refers to a 'built' section map in the player.
 * This 'built' section map expands the Flow sections from manifest and resolves all properties.
 */
export  type PlayerSections = {
    [key: number] : PlayerSections | PlayerSection;
    loopCurrent: number; //current loop iteration of the possible loop flow
    loopLimit: number; //maximum number to loop flow section
    sectionCount: number; //number of sections that follow this level of flows
}



export  type VerboseLevel =
    null | undefined |
    'warning' |
    'info' |
    'all'