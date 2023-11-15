//JSONg Player types
export interface PlayerMetadata {
    title: string;
    author?: string
    createdOn : number;
    timestamp : number;
    projectVersion: string;
    createdUsing?: string;
}

export type PlayerSectionIndex = number[];
export type PlayerPlaybackState = (null | "playing" | "stopping" | "stopped")
export interface PlayerTrack {
    name: string;
	volumeDB: number;
    source : string;
    filter?: {
        resonance: number;
        rolloff: number;
    };
}

export interface PlayerDataSource {
    [key: string] : string
}
export interface PlayerPlaybackInfo {
    bpm: number;
    meter: [number, number];
    totalMeasures: number;
    grain?: number;
    metronome?: [string,string];
    metronomeDB?: number;
}

export interface PlayerSourceMap {
    [key: string] : string
}

export interface PlayerPlaybackMapType { 
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
export interface PlayerPlaybackMap {
    [key: string] : PlayerPlaybackMapType,
}

export type PlayerSectionChangeHandler = (index: undefined | null | PlayerSectionIndex,sectionOverrides: PlayerSectionOverrideFlags[], when?: string)=>void;
export type PlayerSectionRepeatHandler = (index: PlayerSectionIndex, loops: number)=>void;

export type PlayerSectionOverrideFlags =  null | ">" | "X" | "x"
export interface PlayerSectionOverrides { 
    legato?: boolean;
    autoNext?: boolean;
}
export type PlayerPlayingNow = {index: PlayerSectionIndex, name: string} | null



// Helper types
export type FlowValue = (number | string | FlowValue[]);

export type NestedIndex = (number | string)[]

export type NestedType = number | string | {
    [key: number] : NestedType | any;
}

export interface SectionData {
    [key: number] : SectionData | NestedType | any | undefined;
    loop: number;
    loopLimit: number;
    count: number;
}
export type SectionType = SectionData & {
    index: number[];
}
