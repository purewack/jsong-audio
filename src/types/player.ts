
export  type PlayerSectionIndex = number[];

/**
 * Represents the possible states for a JSONg player.
 * 
 * - null: No media is loaded or the player is uninitialized.
 * - "parsing": The player is currently parsing media information.
 * - "stopped": Playback has been stopped but contains media.
 * - "playing": The player is actively playing media.
 * - "queue": The next section is queued for playback.
 * - "next": The player is transitioning from 'current' to 'next' sections, if not transition time this is immediate.
 * - "stopping": The player is in the process of stopping playback.
 */
export  type PlayerPlaybackState = (null | "parsing" |"stopped" | "playing" | "queue" | "next" | "stopping" )


export  interface PlayerBuffers {
    [key: string] : object
}

export  type PlayerSectionOverrideFlags =  null | ">" | "X" | "x"

export  interface PlayerSectionOverrides { 
    legato?: boolean;
    autoNext?: boolean;
}

export  type PlayerPlayingNow = {
    index: PlayerSectionIndex, 
    name: string
} | null

export  type VerboseLevel =
    null | undefined |
    'warning' |
    'info' |
    'all'
