
# Event Listeners

### `JSONg.parse => Promise (isFullyLoaded)=>{}`
> Returns a `Promise` with a boolean value indicating if all audio files are loaded upon `Promise` resolution, else throws error if no files could be loaded

### `JSONg.onSectionPlayStart = (index)=>{}`
> Called when the active playing section changes and starts playing
### `JSONg.onSectionPlayEnd = (index)=>{}`
> Called when the active playing section changes and stops playing
### `JSONg.onSectionWillStart = (index)=>{}` 
> Called when the active playing is about to start soon

### `JSONg.onSectionWillEnd = (index)=>{}`
> Called when the active playing will stop soon


### `JSONg.onSectionRepeat = (index, repeats)=>{}`
> Called when the active playing sub loop repeats


### `JSONg.onTransport = (timePosition, [sectionBeat, sectionBeats])=>{}`
> Callback for timeline ticks and section position, `timePosition` is in the format `measure:beat:16th`. Section transport is `sectionBeat` / `sectionBeats`

### `JSONg.onStateChange = (state)=>{}`
> Possible states include `null` when uninitialized, `stopped`, & `started`

# Control Methods
### `JSONg`:

`const player = new JSONg(Tone, verbose = false)`

This class is instantiated with the `new` keyword and has the following methods:

## File Loading

### `JSONg.parse(song_folder)`
> Parses the `audio.jsong` file internally and loads any music files required to represent the song from provided folder name.

### `JSONg.parse(jsong, dataPath)`
> Manually specify the path to the `.jsong` file and the path to the sources, then parse accordingly from explicit paths.

## Playback

### `JSONg.cancel()`
> Cancel any pending section changes

### `JSONg.stop(after = Time, fadeout = true)`
> Stop music playback. Optionally specify a delay time with or without fading out the music

### `JSONg.play(index = undefined, skip = false, fadeInTime = '1m')`
> Starts music playback from the first section, with current settings 
> After playing commences, any subsequent calls act like `JSONg.next()`

> Optionally specify a fade in time or provide null for immediate playback

### `JSONg.play(index)`
> Starts music playback from the indexed section if stopped, with current settings 

### `JSONg.next()`
> Same as `JSONg.play(null, false)`

> Go to the next section, NOT braking out of any infinite loops in the flow map defined in `audio.jsong`, current grain settings apply unless `map` setting overrides it.

### `JSONg.skip()`
> Same as `JSONg.play(null, true)`

> Go to the next section, braking out of any infinite loops in the flow map defined in `audio.jsong`, current grain settings apply unless `map` setting overrides it.

## Effects

### `JSONg.rampTrackVolume(trackIndex, db, inTime = 0, sync = true)`
> Adjust track volume

### `JSONg.rampTrackFilter(trackIndex, freq, inTime = 0, sync = true)`
> Adjust track Low Pass filter, `freq` is a percentage from 100Hz - 19.9kHz

### `JSONg.crossFadeTracks(outIndexes, inIndexes, inTime = '1m', sync = true)`
> Cross fade `outIndexes` track out, fade in `inIndexes` tracks, all taking place over the duration specified by `inTime`. If `sync` then this action is aligned to the transport grid

# Other

### `audio.jsong`:
> This file maps out sections of music and loop sections as well as all other settings for the player like track volumes and the flow of music for guiding the player through the sections. Can contain audio data in form of data URI or can point to sound files (relative path to `.jsong` file).
<br/>
*See [Concepts](README.md#concepts)*