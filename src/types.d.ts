//JSONg Player types
declare interface PlayerMetadata {
    title: string;
    author: string
    createdOn : number;
    timestamp : number;
    projectVersion: string;
    createdUsing?: string;
}

declare type PlayerSectionIndex = number[];

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
declare type PlayerPlaybackState = (null | "parsing" | "playing" | "queue" | "next" | "stopping" | "stopped")

declare interface PlayerTrack {
    name: string;
	volumeDB: number;
    source : string;
    filter?: {
        resonance: number;
        rolloff: number;
    };
}

declare interface PlayerDataSource {
    [key: string] : string
}
declare interface PlayerPlaybackInfo {
    bpm: number;
    meter: [number, number];
    totalMeasures: number;
    grain?: number;
    metronome?: [string,string];
    metronomeDB?: number;
    filter?: {
        resonance?: number,
        rolloff?: number
    };
}

declare interface PlayerSourceMap {
    [key: string] : string
}

declare interface PlayerPlaybackMapType { 
    region: [number, number];
    grain?: number;
    legato?: number | {
        duration: number;
        xfades: undefined | string[];
    } | {
        duration: undefined | number;
        xfades: string[];
    }
}
declare interface PlayerPlaybackMap {
    [key: string] : PlayerPlaybackMapType,
}


declare type PlayerSectionOverrideFlags =  null | ">" | "X" | "x"
declare interface PlayerSectionOverrides { 
    legato?: boolean;
    autoNext?: boolean;
}
declare type PlayerPlayingNow = {index: PlayerSectionIndex, name: string} | null



// Helper types
declare type FlowValue = (number | string | FlowValue[]);

declare type NestedIndex = (number | string)[]

declare type NestedValue = number | string | any;
declare interface NestedType {
    [key: number | string]: NestedType | NestedValue;
}

declare type SectionData = {
    [key: number] : SectionData | NestedType | any | undefined;
    loop: number;
    loopLimit: number;
    count: number;
}
declare type SectionType = {
    [key: number] : SectionType | SectionData | NestedType | any | undefined;
    loop: number;
    loopLimit: number;
    count: number;
    index: number[];
}
