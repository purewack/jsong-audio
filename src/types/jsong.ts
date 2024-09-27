//JSONg Manifest types

import { DataURIString, URLString } from "./common";

export type JSONgVerison = "J/1"

/**
 * Metadata information about the music and its creator
 */
export  type JSONgMetadata = {
    title: string;
    author: string
    version: string;
    created : number;
    createdUsing?: string;
    modified? : number;
}

/**
 * Vital information about how to properly respond to timed events in a musical manner
 * - `bpm` required to keep a regular pulse for time-aligned events
 * - `meter` specifies the divisions and thereby the granularity of time-aligning
 * - `grain` specifies the default granularity, if not provided in the manifest, it will be calculated using the time of one bar using the meter
 * - `metronome` is used for debugging to hear if everything is aligned correctly
 * - `filter` this information describes how tracks should (default to and) behave when audio filtering is to be applied
 */
export  type JSONgPlaybackInfo = {
    bpm: number;
    meter: [number, number];
    grain?: number | null;
    metronome?: 
        {db: number, high?: string, low?: string} | 
        {high: string, low?: string} | 
        {high?: string, low: string} | 
        boolean | null;
    filter?: 
        {resonance: number,rolloff: number}    |
        {resonance?: number, rolloff:  number} |
        {resonance:  number, rolloff?: number};
}


/**
 * Details of each track along with the required 
 */
export type JSONgTrack = {
    name: string;
    source : string;
	db?: number;
    filter?: {
        resonance: number;
        rolloff: number;
    };
}

/**
 * Sources information
 */
export  type JSONgDataSources = {
    [key: string]: URLString | DataURIString
}

export type JSONgFlowInstruction = {
    //name of section reference
    name: string; 
    
    //granularity of current section - override
    grain?: number;

    //whether the section only plays once without looping itself - override
    once?: boolean; 

     //which tracks to fade, if true fade all, if number fade all over the given time - override
    fade?: boolean
    | number 
    | string[] 
    | {[key:string] :{ 
        duration: number | string //explicit definition of fade times per track
    }}
} 
export type JSONgFlowEntry = (number | string | JSONgFlowInstruction) | JSONgFlowEntry[]

/**
 * Final manifest file layout
 */
export  type JSONgManifestFile = {
    type: 'jsong' | undefined;
    version: JSONgVerison;
    meta: JSONgMetadata;
    playback: JSONgPlaybackInfo & {
        map: {[key: string] : [number, number]};
        flow: JSONgFlowEntry[];
    };
    tracks: JSONgTrack[];
    sources?: JSONgDataSources;
}