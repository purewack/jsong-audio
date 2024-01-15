
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
export  type PlayerState = (null | "parsing" |"stopped" | "playing" | "queue" | "next" | "stopping" )

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
    legato?: boolean;
    autoNext?: boolean;
}

/**
 * Describes either the current section or scheduled sections for referencing outside the player
 */
export  type PlayerSection = {
    index: PlayerIndex, 
    name: string,
    region: [number, number],
    grain: number,
    when?: string
} | null

export  type VerboseLevel =
    null | undefined |
    'warning' |
    'info' |
    'all'
