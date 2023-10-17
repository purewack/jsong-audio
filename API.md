
# Event Listeners

### `JSONg.parse => Promise (isFullyLoaded)=>{}`
> Returns a `Promise` with a boolean value indicating if all audio files are loaded upon `Promise` resolution, else throws error if no files could be loaded

### `JSONg.onSectionStart = (sectionName)=>{}`
> Called when the active playing section changes and starts playing
### `JSONg.onSectionEnd = (sectionName)=>{}`
> Called when the active playing section changes and stops playing
### `JSONg.onSectionWillStart = (sectionName)=>{}` `JSONg.onSectionWillEnd = (sectionName)=>{}`
> Called when the active playing will stop and a new section will start


### `JSONg.onTransport = (timePosition, [sectionBeat, sectionBeats])=>{}`
> Callback for timeline ticks and section position, `timePosition` is in the format `measure:beat:16th`. Section transport is `sectionBeat` / `sectionBeats`

### `JSONg.onStateChange = (state)=>{}`
> Possible states include `null` when uninitialized, `stopped`, & `started`

# Control Methods
### `JSONg`:

`const player = new JSONg(Tone, verbose = false)`

This class is instantiated with the `new` keyword and has the following methods:

### `JSONg.parse(data)`
> Parses the `.jsong` file internally and loads any music files required to represent the song.

### `JSONg.parse(jsong, dataPath)`
> Manually specify the path to the `.jsong` file and the path to the sources, then parse accordingly.

### `JSONg.stop()`
> Stop music playback.

### `JSONg.cancel()`
> Cancel any pending section changes

### `JSONg.play()`
> Starts music playback from the first section, with current settings 
> After playing commences, any subsequent calls act like `JSONg.next()`

### `JSONg.play(index)`
> Starts music playback from the indexed section if stopped, with current settings 

### `JSONg.next()`
> Go to the next section, NOT braking out of any infinite loops in the flow map defined in `audio.jsong`, current grain settings apply unless `map` setting overrides it.

### `JSONg.skip()`
> Go to the next section, braking out of any infinite loops in the flow map defined in `audio.jsong`, current grain settings apply unless `map` setting overrides it.

### `JSONg.rampTrackVolume(trackIndex, db, inTime = 0, sync = true)`
> Adjust track volume

### `JSONg.rampTrackFilter(trackIndex, freq, inTime = 0, sync = true)`
> Adjust track Low Pass filter


### `audio.jsong`:
> This file maps out sections of music and loop sections as well as all other settings for the player like track volumes and the flow of music for guiding the player through the sections. Can contain audio data in form of data URI or can point to sound files (relative path to `.jsong` file).
<br/>
*See [Concepts](README.md#concepts)*