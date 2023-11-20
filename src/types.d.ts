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
declare type PlayerPlaybackState = (null | "playing" | "stopping" | "stopped")
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

declare type NestedType = number | string | {
    [key: (number | string)] : NestedType | any;
}

declare interface SectionData {
    [key: number] : SectionData | NestedType | any | undefined;
    loop: number;
    loopLimit: number;
    count: number;
}
declare type SectionType = SectionData & {
    index: number[];
}
