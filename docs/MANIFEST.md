# .jsong Manifest file - version J/1

All type information about how to write the file manually can be found in [src/types/jsong.ts](../src/types/jsong.ts)
This is the root of the file.
a .jsong file is really just a .json file. This fact also makes it possible to load standard .json files into the player. The requirement is that the `type:jsong` is specified and that these required sections are provided. 
The actual json file can contain extra unrelated information, or even several other jsong song, but those would need to be pre-parsed manually and split into individual objects to be passed to the player later.

```json
{
    "type": "jsong",
    "version":"J/1",
    "meta": {...},
    "playback" :{
        "map": {},
        "flow": {},
        "tracks": []
    },
    "sources" : {}
}
```


# File Information

```json
"type": "jsong",
"version":"J/1",
```
> File type and version identifier

# Metadata Information

*Location in file*
```json
{
    "meta": {...}
}
```

*Example definition*
```json
  "meta": {
    "title": "Test",
    "author": "Damian Nowacki",
    "created" : "20230325",
    "modified" : "1679741210",
    "version": "1.0.0",
    "createdUsing": "melonjuice",
    "meta": "extra metadata information or description..."
  },
```
> Song title and creator details.

# Playback Information

*Location in file*
```json
{
    "playback": {...}
}
```

*Example definition*
```json
"playback" : {
    "bpm": 95.0,
    "meter": [4, 4],
    "grain": 4,
    "metronome": {"high":"B5","low":"G4"},
    "audioOffsetSeconds": 0.049;
    "map": {},
    "flow": []
}
```
> `"bpm"` : float - determines the tempo of the song's metronome and the timing of events, very critical that it matches the actual tempo of recordings.

> `"meter"` : array [Integer, Integer] - also known as a [Time Signature](https://en.wikipedia.org/wiki/Time_signature), used for timing of events, first entry is the number of beats in bar, second is the length of each beat 

> `"totalMeasures"` : Integer - song total length in bars / measures

> `"grain"` : Integer - the default timing quantization in beats, if not defined, the default is taken from the meter to equal one bar length.

### Metronome (optional)

> `"metronome"` : array [String, String] - first array index is the pitch of the metronome click of the first beat of a bar, second array index is the pitch of all other clicks, if not defined, the metronome will not be enabled, unless in verbose mode, then metronome is always on.

> `"metronomeDB"` : float - volume of the metronome


## Map

*Location in file*
```json
  {
    "playback": {
        "map": {...}
    }
}
```

*Example definition*
```json
"map": {
    "intro" : [0, 8],
    "chorus" : [8, 24],
    "verse1" : [24, 32],
},
```
> `"region"` : `Array [Number, Number]` - defines a loop area for a section, start and end points are measured in bars. 

> `"grain"` : `Integer` - defines the granularity of the triggering, i.e. in how many beats the next action in queue can take place. Unit is in beats. If property is not defined, the global setting takes precedence, defined in [`"playback"`](#playback-information)

> `"legato"` : `Integer || {Integer? ^ string[]?}` - defines the time taken to fade in from the currently playing section to this section. 
<br/> Automatically crossfades all track from to this section, if this property is defined, otherwise no transition is made.
<br/>
This property can also be an object with specific definition of which tracks should be crossfaded.


## Flow

*Location in file*
```json
{
    "playback": {
        "flow": [...]
    }
}
```

*Example definition*
```json
"flow": [
    "intro", 
    "chorus", 
    "verse1", 
    "bridge1", 
    [4, "verse2", "bridge1"],
    [["chorus","verse2"],"intro"]
]
```
> `"flow"` : `[ String || [String] ]` - an array containing the song structure and how repeats should work in subsection arrays (see [Concepts](README.md#subsection)), nesting level not limited, therefore you can include arrays in arrays, beware that is a repeat limit is not imposed then the player will get stuck in a loop if not using [`JSONg.skip()`](API.md#jsongskip)

## Tracks

*Location in file*
```json
{
    "tracks": [ {} , ... ]
}
```

### Track data entry
```json
{
	"name": "drums",
	"volumeDB": 0,
    "source" : "lnkwgpyw"
}
```
> `"name"` : String - track name

> `"volumeDB"` : float - default track volume in the mix

> `"source"` : String - optional name of the source file, if not specified, the track name is used instead to refer to a buffer

## Sources 

*Location in file*
```json
{
    "sources": {
        bufferID : data
    }
}
```

*Example definition*
```json
{
    "lnkwgpyh" : "./bass.mp3",
    "lnkwgpyo" : "drum.mp3",
    "lnkwgpyw" : "data:audio/wav;base64,UklGRi..."
}
```
> `"bufferID" : URL` - key is the unique buffer ID and value is either a URL or an encoded URI of an audio file.
* Paths prepended with `./` are relative paths to the manifest file, for the internal `fetch()` function, a baseURL is prepended in the form of the relative path to the manifest.
* Paths with no prefix but not a `data` URI are treated as paths to the `public/` dir. 
* You can also specify an absolute URL to a completely external source.
 
