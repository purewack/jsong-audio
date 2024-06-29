import { NestedIndex, NestedType } from "./common";

export  type PlayerIndex = number[];

/**
 * Represents the possible states for a JSONg player.
 * 
 * - `null`: No media is loaded or the player is uninitialized.
 * - `"parsing"`: The player is currently parsing media information.
 * - `"stopped"`: Playback has been stopped but contains media.
 * - `"playing"`: The player is actively playing media.
 * - `"queue"`: The next section is queued for playback.
 * - `"next"`: The player is transitioning from 'current' to 'next' sections, if not transition time this is immediate.
 * - `"stopping"`: The player is in the process of stopping playback.
 */
export  type PlayerState = (null | "parsing" | "loading" |"stopped" | "playing" | "queue" | "next" | "stopping" )

/**
 * A set of flags that can be provided in the flows part of the manifest.
 * - `>` automatically go to the next section after the region end is reached
 * - `X` or `x` automatically cross-fade the current section into the next one when triggered
 */
export  type PlayerSectionOverrideFlags =  null | ">" | "X" | "x"

/**
 * Expanded boolean flags using `PlayerSectionOverrideFlags`
 */
export  type PlayerSectionOverrides = { 
    fade: boolean;
    next?: boolean;
} | { 
    fade?: boolean;
    next: boolean;
}

/**
 * Describes either the current section or scheduled sections for referencing outside the player
 */
export  type PlayerSection = {
    index: PlayerIndex, 
    name: string,
    region: [number, number],
    grain: number,
    when?: string,
    overrides?: PlayerSectionOverrides
} | null

export  type VerboseLevel =
    null | undefined |
    'warning' |
    'info' |
    'all'

export type SectionData = {
    name: string, 
    index: NestedIndex, 
    next: NestedIndex, 
    overrides?: PlayerSectionOverrides
}
/**
 * This is an extension of a nested type where it specifically refers to a 'built' section map in the player.
 * This 'built' section map expands the Flow sections from manifest and resolves all properties.
 */
export  type SectionInfo = {
    [key: number] : SectionInfo | SectionData;
    loopCurrent: number;
    loopLimit: number;
    sectionCount: number;
}

// /**
//  * This is the root type for sections with one addition, the current index counter. This counter is vital to keep track of the sections flow.
//  */
// export  type SectionType = SectionData & {
//     at: number[];
// }