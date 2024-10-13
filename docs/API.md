
# Class Description
### `JSONg` constructor:

*See [types](../src/types/README.md) for available type declarations*

```ts
const player = new JSONg(
    path?:string, 
    options?: {
        onload?: ()=>void, 
        context?: AudioContext, 
        verbose?: VerboseLevel,
        disconnected?: boolean,
        debug?: boolean
    }
)
```
You can provide a song to load right away upon the creation, but you will have to provide a callback using `options.onload` as the constructor cannot be `async`.

You can also provide your own `AudioContext` into the player using `option.context`

If you specify `option.disconnected = true`, the player will not be automatically connected to the audio context output node. This is done so that you can manually route the player through other effect nodes manually using the `output` property.

This `JSONg` object is instantiated with the `new` keyword and has the following public methods:

- [`parseManifest()`](#async-parsemanifestfile-string--jsongmanifestfile-promiseplayerjsong--undefined)
- [`useManifest()`](#async-usemanifestmanifest-playerjsong-optionsorigin-string-loadsound-playeraudiosources--promisevoid)
- [`useAudio( )`](#useaudiosources-jsongdatasources--playeraudiosources-origin-string-offset-number-promiseundefined)
- [`play()`](#async-playfrom-playerindex---promisevoid)
- [`continue()`](#async-continuebreakout-boolean--playerindex--false-promisevoid)
- [`stop()`](#async-stopsynced-boolean--true---promiseplayersection--undefined)
- [`cancel()`](#cancel)
- [`getSectionProgress()`](#getsectionprogress)
- [`getPosition()`](#getposition)
- [`getProgression()`](#getprogression)

- [`toggleMetronome()`](#togglemetronomestateboolean)
- [`isMute()`](#ismute)
- [`mute()`](#mutevalue-number--0)
- [`unmute()`](#mutevalue-number--0)

- [`audioSafeCallback()`](#audiosafecallbackcallback-void)

The following public properties are available for usage also:

- ```ts
    trackList: { 
        name: string;
        source: string;
        db: number;
        audioOffsetSeconds:number;
    }[]
    ```
    This list provides the names of the tracks, the source that it uses, as well as any audio offset that is being used.

- ```ts
    tracks: {
        [key: string]: Volume;
    }
    ```
    This is a set of output nodes for all tracks, this way individual track volumes may be controlled externally.

- ```ts
    sections: PlayerSectionGroup
    ```
    These are the loaded song sections that have been parsed from the manifest file. This is what the player uses to reference region lengths and flow rules for repeats, as well as transitioning directives and information regarding scheduling.

- ```ts
    beginning: PlayerIndex
    ```
    This is the first section that will be used to start from by default.

- ```ts
    current: PlayerSection
    ```
    This is the current section that is playing now.

- ```ts
    next: [PlayerSection | undefined, PlayerIndex[] | undefined]
    ```
    This will be the next section that the player will transition to, if not cancelled.

- ```ts
    state: PlayerState
    ```
    This is the current state of the player, reflecting any actions that the player is about to take.

- ```ts
    timingInfo: {
        bpm: number;
        meter: [number, number];
        grain: number;
        beatDuration: number;
        metronome: {
            db: number;
            high: string;
            low: string;
            enabled: boolean;
        };
    }
    ```
    This is internal information used by the player sourced from the manifest file to determine key timing parameters for scheduling sections.

- ```ts
    output: Volume
    ```
    This is the main output node that is connected to the `AudioContext` output by default


## File Loading

### `async parseManifest(file: string | JSONgManifestFile): Promise<PlayerJSONg | undefined>`

This function allows you to pre process a manifest file in the background, in order to check if the file is adequate for loading into the player. This gives you the ability to preload the file as to not interrupt the player. You can even preload several files and all their audio sources for hot-swapping them without interrupting audio playback.

*Parameter: `file` - either a string or an already parsed JSON file as a JavaScript object.*

*Returns: `Promise` - with a resulting JS object that contains all necessary details to load a song into the player. Use this later with the `useManifest` function.*

### `async useManifest(manifest: PlayerJSONg, options?:{origin?: string, loadSound?: PlayerAudioSources}) : Promise<void>`
This function uses pre-parsed manifest files in order to actually load the player with music information. You can provide options which are there to stop the default behaviour of trying to load audio sources from the manifest.

You can manually create the appropriate audio buffers and either feed them later using `useAudio` or provide them here using `options.loadSound`.

*Parameter: `manifest` - a JS object retured by a successful call to `parseManifest()`*

*Parameter: `options` - an optional option set for directing the player on if / how to load audio sources. You can provide the origin url which is used as a base to fetch audio files from. You can also provide a whole object full of audio buffers to be used by the player*

*Returns: `Promise` - resolved when all is loaded correctly, and rejected if any errors take place*

### `useAudio(sources: JSONgDataSources | PlayerAudioSources, origin?: string, offset?: number): Promise<undefined>`
This section is used internally by `useManifest` as a default strategy to loading audio sources. You can specify that `useManifest` should not load audio, and proceed to do so manually. This is useful for other applications which could for example use Electron.js and load files that are local on the user's machine.

*Parameter: `sources` - a set of key pair values, keys are track names as strings, values are either:*
- *a URL to the file, where the `origin` parameter is considered if provided*
- *a `ToneAudioBuffer` which can also use a URL to fetch audio data* 
- *an AudioBuffer that is manually loaded with the correct audio data, this is likely to be done using the player's [`AudioContext.decodeAudioData()`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)*

*Parameter: `origin` - a base URL host to fetch files from*

*Parameter: `offest` - you can offset the audio source in seconds. This is useful if the audio file has silent `whitespace` at the beginning, which is often a case with mp3 files generated using cetrain encoders.*

## Playback

### `async play(from?: PlayerIndex ) : Promise<void>`
Used to initiate the song playback.
(*not applicable if player is already playing*)

After the first call from stopped state, the player is put into a playing state.
Any subsequent calls to play will be ignored until in the `stopped` state again.

*Parameter: `from` - You may play `from` any section or from the beginning if unspecified*

*returns `Promise` - awaits the player to finish playing 
in the case that the beginning section has a `once` directive.*
 
*Throws on cancellation, i.e. the `stop` command*

### `async continue(breakout: (boolean | PlayerIndex) = false): Promise<void>`
Used to initiate the next section to advance to.
(*not applicable if player is stopped*)

*Parameter `breakout` - if `breakout` is true, repeat rules do not apply,*
*You may also breakout to any section if `breakout` is a `PlayerIndex` or advance to the next logical section automatically if nothing is provided*
*If forcing a different section and breaking up the natural progression, section repeat counter are not advanced*

*Returns `Promise` - fired when the player switches to the queued section*

*Throws on cancellation, i.e. the `stop` or `cancel` command*

### `async stop(synced: boolean = true)  : Promise<PlayerSection | undefined>`
This stop audio playback
(*not applicable if player is not already playing*)

This function also cancels any pending changes.
You may specify that the stop occur abruptly via `synced = false`, otherwise
the stop will wait the appropriate amount of time according to the current section directives.

*Parameter: `synced` - if false, stop is immediate*

*Returns: `Promise` - resolved when the stop takes place*

*Throws on cancellation using the `cancel` command*

### `cancel()`
This function will cancel any pending changes that are queued up

### `getProgression()`
Returns serialised information about where in the song the player is.
Details like the current section as well as the potential next section, which group repeat counters will be incremented, and the current group repeat counters.

*Returns: `object` - name refers to the current section name* 
```ts
    {
        name: string;
        index: PlayerIndex;
        next: PlayerIndex | undefined;
        increments: PlayerIndex[] | undefined;
        repeatCount: number;
        repeatLimit: number;
    }
```

### `getSectionProgress()`
This is a ratio of the current section progression, you can also get this by listening to the `TransportEvent`.

*Returns: `number` in the range 0 - 1, derived from `currentSectionBeat / beatsInCurrentSection`*

### `getPosition()`
This returns more precise details about the player's transport information, section progress, and metronome clicks.

*Returns: `object` - `section` property being the progress [sectionBeat, sectionBeats]*
```ts
{
    section: number[];
    countdown: number;
    transport: {
        beat: number;
        transport: string;
    };
    lastLaunchTime: string | null;
    contextTime: number;
}
```

### `toggleMetronome(state?:boolean)`
Toggle the current metronome state or manually specify the metronome enable state

*Parameter: `state` - optional boolean to either turn of the metronome or turn off*

### `isMute()`
*Returns boolean whether the master output node is muted or not*

### `mute(value: number = 0)`
Explicitly mute the master `output` node with a 1 second fadein

*Parameter: `value` - specify the db value to raise the volume to*

### `audioSafeCallback(callback: ()=>void)`
Used to schedule synchronized callbacks that alter the DOM or which can cause audio glitches
*Parameter: callback callback is invoked at the correct time.*

