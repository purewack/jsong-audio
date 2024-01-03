# Layout of *.jsong Manifest file
```
{
    "type": "jsong",
    "jsongVersion":"0.0.1",
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

```
"type": "jsong",
"jsongVersion":"0.0.1",
```
> File type and version indentifier

# Metadata Information

*Location in file*
```
{
    "meta": {...}
}
```

```
  "meta": {
    "title": "Test",
    "author": "Damian Nowacki",
    "createdOn" : "20230325",
    "timestamp" : "1679741210",
    "projectVersion": "1.0.0",
    "createdUsing": "melonjuice"
  },
```
> Song title and creator details.

> `"createdUsing"` is used by the parser internally to determine what editor was used to generate the file, typically the melonJuice generator

# Playback Information

*Location in file*
```
{
    "playback": {...}
}
```

```
"playback" : {
    "bpm": 95.0,
    "meter": [4, 4],
    "totalMeasures": 56,
    "grain": 4,
    "metronome": ["B5","G4"],
    "metronomeDB": -8,
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
```
{
    "playback": {
        "map": {...}
    }
}
```

```
"map": {
    "intro" : { "region": [0, 8]},
    "chorus" : { "region": [8, 24], "grain": 8},
    "verse1" : { "region": [24, 32], "grain": 4},
    "bridge1" : { "region": [32, 40], "grain": 4},
    "verse2" : { "region": [40, 48], "grain": 4, "legato": 4}
    "verse3" : { "region": [40, 48], "grain": 4, "legato": {
        "duration": 8,
        "xfades": ["guitar", "lead"]
    }}
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
```
{
    "playback": {
        "flow": [...]
    }
}
```
```
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
```
{
    "tracks": [ {} , ... ]
}
```

### Track data entry
```
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
```
{
    "sources": {
        bufferID : data
    }
}
```

Example entry:
```
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
 