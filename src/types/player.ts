import { ToneAudioBuffer } from "tone";
import { JSONgFlowEntry, JSONgFlowInstruction, JSONgMetadata, JSONgTrack, JSONgVerison } from "./jsong";

/**
 * Represents the possible states for a JSONg player.
 * 
 * - `null`: No media is loaded or the player is uninitialized.
 * - `"parsing"`: The player is currently parsing media information.
 * - `"loading"`: The player is currently loading media buffers.
 * - `"stopped"`: Playback has been stopped and is ready to play media.
 * - `"playing"`: The player is actively playing media.
 * - `"queue"`: A next section is queued for playback. This state will revert to `playing` after the new section takes place.
 * - `"transition"`: The player is transitioning from 'current' to 'next' sections if tracks are fading.
 * - `"stopping"`: The player is in the process of stopping playback.
 */
export  type PlayerState = (null | "parsing" | "loading" |"stopped" | "playing" | "queue" | "continue" | "transition" | "stopping" )


/**
 * Used to refer to built player section for progression purposes
 */
export  type PlayerIndex = number[];



/**
 * Full section information
 * Describes either the current section or JSONgSeconscheduled sections for referencing outside the player
 */
export type PlayerSection = {
    name: string,
    region: [number, number],
    index: PlayerIndex, 
    next: PlayerIndex, 
    grain: number,
    once: boolean,
    transition: 
        {
            name: string;
            type: "fade" | "sync",
            duration: number;
        }[]  
};

/**
 * This is an extension of a nested type where it specifically refers to a 'built' section map in the player.
 * This 'built' section map expands the Flow sections from manifest and resolves all properties.
 */
export  type PlayerSectionGroup = {
    [key: number] : PlayerSectionGroup | PlayerSection;
    loopCurrent: number; //current loop iteration of the possible loop flow
    loopLimit: number; //maximum number to loop flow section
    sectionCount: number; //number of sections that follow this level of flows
}


export type PlayerSourcePaths = {[key:string]: string}

export type PlayerAudioSources = {[key: string]: AudioBuffer} | {[key: string]: ToneAudioBuffer}

export type PlayerManifest = {
  version: JSONgVerison,
  meta: JSONgMetadata,
  sections: PlayerSectionGroup,
  flow: JSONgFlowEntry[],
  beginning: PlayerIndex,
  tracksList: JSONgTrack[],
  paths: PlayerSourcePaths,
  origin: string,
  timingInfo: {
    bpm: number;
    meter: [number, number];
    grain: number;
    beatDuration: number;
    metronomeSchedule: null;
    metronome: {
        db: number;
        high: string;
        low: string;
        enabled: boolean;
    };
  }
}

export  type VerboseLevel =
    null | undefined |
    'warning' |
    'info' |
    'all'