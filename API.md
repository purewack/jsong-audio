
# Event Listeners

### `JSONg.onSectionPlayStart`
```
onSectionPlayStart?: (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[])=>void;
```
Called when the active playing section changes and starts playing

### `JSONg.onSectionPlayEnd`
```
onSectionPlayEnd?:    (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[])=>void;
```
Called when the active playing section changes and stops playing

### `JSONg.onSectionWillStart` 
```
onSectionWillStart?: (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[], when?: string)=>void;
```
Called when the active playing is about to start soon

### `JSONg.onSectionWillEnd`
```
onSectionWillEnd?: (index: PlayerSectionIndex, sectionOverrides: PlayerSectionOverrideFlags[], when?: string)=>void;
```
Called when the active playing will stop soon


### `JSONg.onSectionRepeat`
```
onSectionRepeat?: (index: PlayerSectionIndex, loops: number)=>void;
```
Called when the active playing sub loop repeats


### `JSONg.onTransport`
```
onTransport?: (position: BarsBeatsSixteenths, loopBeatPosition?: [number, number] )=>void;
```
Callback for timeline ticks and section position, `timePosition` is in the format `measure:beat:16th`. Section transport is `sectionBeat` / `sectionBeats`

### `JSONg.onStateChange`
```
onStateChange?: (state: PlayerPlaybackState)=>void;
```
Possible states include `null` when uninitialized, `stopped`, & `started`


# Control Methods
### `JSONg constructor`:

`const player = new JSONg(verbose = false)`

This class is instantiated with the `new` keyword and has the following methods:

## File Loading

### `JSONg.parse`
Function Signature:
```
parse(folderPath: string): Promise<string>;

parse(manifestPath: string, dataPath: string): Promise<string>
```
Promise Signature:
```
Promise(
    resolve: (reason: string, detail?: any)=>void, 
    reject: (reason: string, detail?: any)=>void
)
```
Returns a `Promise` with a boolean value indicating if all audio files are loaded upon `Promise` resolution, else throws error if no files could be loaded

## Playback

### `JSONg.cancel`
Function Signature:
```
cancel() : void
```
Cancel any pending section changes

### `JSONg.stop`
Function Signature:
```
stop(after: Time = '4n', fadeout: boolean = true) : void
```
Stop music playback. Optionally specify a delay time with or without fading out the music

### `JSONg.play`
Function Signature:
```
play(
    from: PlayerSectionIndex | null = null, 
    skip: (boolean | string) = false,
    fadein: Time = 0
) : void
```
Starts music playback from the first section, with current settings. After playing commences, any subsequent calls act like a next section call.

Optionally specify a fade in time or provide null for immediate playback

### `JSONg.skip`
Function Signature:
```
skip() : void

skipOffGrid() : void
```
Go to the next section, braking out of any infinite loops in the flow map defined in `audio.jsong`, current grain settings apply unless `map` setting overrides it.

*Use the `OffGrid` variant to apply grain setting to the instant moment and not section start time.*

### `JSONg.skipTo`
Function Signature:
```
skipTo(index: PlayerSectionIndex, fade = '4n')  : void

skipToOffGrid(index: PlayerSectionIndex, fade = '4n')  : void    
```
Starts music playback from the indexed section. If stopped, the `fade` time will apply

*Use the `OffGrid` variant to apply grain setting to the instant moment and not section start time.* 

## Effects

### `JSONg.rampTrackVolume`
Function Signature:
```
rampTrackVolume(trackIndex: string | number, db: number, inTime: BarsBeatsSixteenths | Time = 0, sync: boolean = true)
```
Adjust track volume, indexed by either track name or track number. Apply `db` value in the time `inTime`, with the possibility of `sync` to align to song bpm grid.

### `JSONg.rampTrackFilter`
Function Signature:
```
rampTrackFilter(trackIndex: string | number, percentage: number, inTime: BarsBeatsSixteenths | Time = 0, sync: boolean = true)
```
Adjust track Low Pass filter, `freq` is a percentage from 100Hz - 19.9kHz.

### `JSONg.crossFadeTracks`
Function Signature:
```
crossFadeTracks(outIndexes: (string | number)[], inIndexes: (string | number)[], inTime: BarsBeatsSixteenths | Time = '1m', sync: boolean = true)
```
Cross fade `outIndexes` track out, fade in `inIndexes` tracks, all taking place over the duration specified by `inTime`. If `sync` then this action is aligned to the transport grid.

# Other

### `JSONg.meta`
Return value signature:
```
{
    title: string;
    author: string
    createdOn : number;
    timestamp : number;
    projectVersion: string;
    createdUsing?: string;
}
```
A getter for meta data contained in the `.jsong` file


### `audio.jsong`:
This file maps out sections of music and loop sections as well as all other settings for the player like track volumes and the flow of music for guiding the player through the sections. Can contain audio data in form of data URI or can point to sound files (relative path to `.jsong` file).
<br/>
*See [Concepts](README.md#concepts)*

*See [types](src/types.d.ts) for available type declarations*