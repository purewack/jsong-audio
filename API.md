
# Event Listeners

### `JSONPlayer.onLoad((progress,final)=>{})`

### `JSONPlayer.onRegionStart((regionName)=>{})`
### `JSONPlayer.onRegionEnd((regionName)=>{})`

### `JSONPlayer.onRegionWillStart((regionName)=>{})`

### `JSONPlayer.onRegionWillEnd((regionName)=>{})`

### `JSONPlayer.onRegionTransport((regionName, beat, totalRegionBeats)=>{})`

### `JSONPlayer.onSongTransport((currentRegionName, beat, totalRegionBeats)=>{})`

# Control Methods
### `JSONPlayer`:

`const player = new JSONPlayer(audio.json)`

This class is instanciated with the `new` keyword and has the following methods:

### `JSONPlayer.parse(data)` / `new JSONPlayer(data)`
> Parses the JSON file internally and loads any music files required to represent the song.

### `JSONPlayer.start()`
> Starts music playback from current section, with current settings 

### `JSONPlayer.stop()`
> Stop music playback.

### `JSONPlayer.next(breakOut)`
> Go to the next section in the flow map defined in `audio.json`, current grain settings apply.

### `JSONPlayer.goTo(regionName)`
> Go to the named region section in the region map defined in `audio.json`, current grain settings apply.

### `JSONPlayer.rampTrackVolume(trackIndex, db, inTime = 0, sync = true)`
> Adjust track volume

### `JSONPlayer.rampTrackFilter(trackIndex, freq, inTime = 0, sync = true)`
> Adjust track Low Pass filter


### `audio.json`:
> This file maps out sections of music and loop regions as well as all other settings for the player like track volumes and the flow of music for guiding the player through the sections. Can contain audio data in form of data URI or can point to sound files (relative path to `.json` file).
<br/>
*See [Concepts](README.md#concepts)*