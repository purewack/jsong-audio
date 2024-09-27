//JSONg Manifest types

import { DataURIString, FlowValue, URLString } from "./common";

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
 * This type supplies information required to construct a section of music
 * - `region` defines the start and end bars of the section
 * - `grain` is an optional override of global granularity
 * - `legato` is an optional override of the global cross-fade time and tracks which to cross fade
 */
export  type JSONgSection = { 
    region: [number, number];
    grain?: number | undefined;
    legato?: number | {
        duration: number;
        xfades?: string[];
    } | {
        duration?: number;
        xfades: string[];
    } | undefined;
}



/**
 * Details of each track along with the required 
 */
export  type JSONgTrack = {
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


/**
 * Final manifest file layout
 */
export  type JSONgManifestFile = {
    type: 'jsong' | undefined;
    version: JSONgVerison;
    meta: JSONgMetadata;
    playback: JSONgPlaybackInfo & {
        flow: FlowValue[];
        map: {[key: string] : JSONgSection};
    };
    tracks: JSONgTrack[];
    sources?: JSONgDataSources;
}


/**
 * A set of flags that can be provided in the flows part of the manifest.
 * - `>` automatically go to the next section after the region end is reached
 * - `X` or `x` automatically cross-fade the current section into the next one when triggered
 */
export  type FlowOverrideFlags =  null | ">" | "X" | "x"
