import { JSONgFlowInstruction } from "./jsong";

/**
 * Represents the possible states for a JSONg player.
 * 
 * - `null`: No media is loaded or the player is uninitialized.
 * - `"parsing"`: The player is currently parsing media information.
 * - `"loading"`: The player is currently loading media buffers.
 * - `"stopped"`: Playback has been stopped and is ready to play media.
 * - `"playing"`: The player is actively playing media.
 * - `"queue"`: A next section is queued for playback. This state will revert to `playing` after the new section takes place.
 * - `"transition"`: The player is transitioning from 'current' to 'next' sections if tracks are fading.
 * - `"stopping"`: The player is in the process of stopping playback.
 */
export  type PlayerState = (null | "parsing" | "loading" |"stopped" | "playing" | "queue" | "transition" | "stopping" )


/**
 * Used to refer to built player section for progression purposes
 */
export  type PlayerIndex = number[];



/**
 * Full section information
 * Describes either the current section or JSONgSeconscheduled sections for referencing outside the player
 */
export type PlayerSection = {
    index: PlayerIndex, 
    next: PlayerIndex, 
    grain: number,
    region: [number, number]
} & JSONgFlowInstruction;

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