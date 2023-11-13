//JSONg Player types

import { Tone } from "tone/build/esm/core/Tone";

export type PlayerSectionIndex = number[];
export type PlayerPlaybackState = (null | "started" | "playing" | "stopping" | "stopped")
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

export interface PlayerPlaybackMap {
    [key: string] : { 
        region: [number, number];
        grain?: number;
        legato?: number | {
            duration: number;
            xfades: undefined | string[];
        } | {
            duration: undefined | number;
            xfades: string[];
        }
    },
}

export type PlayerSectionChangeHandler = (index: undefined | null | PlayerSectionIndex, when?: string)=>void;
export type PlayerSectionRepeatHandler = (index: PlayerSectionIndex, loops: number)=>void;

export type PlayerSectionOverrideFlags = null | ">" | "X" | "x"
export interface PlayerSectionOverrides { 
    legato?: boolean;
    autoNext?: boolean;
}



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
