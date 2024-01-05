//JSONg Manifest types

import { DataURIString, FlowValue, URLString } from "./common";

export  interface JSONgMetadata {
    title: string;
    author: string
    createdOn : number;
    timestamp : number;
    projectVersion: string;
    createdUsing?: string;
}


export  interface JSONgPlaybackInfo {
    bpm: number;
    meter: [number, number];
    grain?: number | null;
    metronome?: [string,string];
    metronomeDB?: number;
    filter?: {resonance: number,rolloff: number}
    | {resonance?: number, rolloff:  number}
    | {resonance:  number, rolloff?: number};
}


export  interface JSONgPlaybackMapType { 
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

export  interface JSONgPlaybackMap {
    [key: string] : JSONgPlaybackMapType,
}

export  interface JSONgTrack {
    name: string;
    source : string;
	volumeDB?: number;
    filter?: {
        resonance: number;
        rolloff: number;
    };
}

export  interface JSONgDataSources {
    [key: string]: URLString | DataURIString
}

export  type JSONgManifestFile = {
    type: 'jsong' | undefined;
    jsongVersion: string;
    meta: JSONgMetadata;
    playback: JSONgPlaybackInfo & {
        flow: FlowValue[];
        map: JSONgPlaybackMap;
    };
    tracks: JSONgTrack[];
    sources: JSONgDataSources;
}