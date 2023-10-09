# Layout of *.audio.json Manifest file
```
{
    "type": "jsonAudio",
    "jsonAudioVersion":"0.0.1",
    "meta": {...},
    "playback" :{
        "map": {},
        "flow": {},
        "tracks": []
    },
    "data" : []
}
```

# File Information

```
"type": "jsonAudio",
"jsonAudioVersion":"0.0.1",
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
    "projectVersion": "1.0.0",
    "createdUsing": ""
  },
```
> Song title and creator details.

> `"createdUsing"` is used by the parser internally to determine what editor was used to generate the file

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
    "length": 56,
    "grain": 4,
    "metronome": ["B5","G4"],
    "metronomeDB": -8,
    "map": {},
    "flow": []
}
```
> `"bpm"` : float - determines the tempo of the song's metronome and the timing of events, very critical that it matches the actual tempo of recordings.

> `"meter"` : array [Integer, Integer] - also known as a [Time Signature](https://en.wikipedia.org/wiki/Time_signature), used for timing of events, first entry is the number of beats in bar, second is the length of each beat 

> `"length"` : Integer - song total length in bars

> `"grain"` : Integer - the default timing quantization in beats

### Metronome (optional)

> `"metronome"` : array [String, String] - first array index is the pitch of the metronome click of the first beat of a bar, second array index is the pitch of all other clicks, if this key is missing, the metronome will not be enabled

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
    "verse2" : { "region": [40, 48], "grain": 4}
},
```

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
    ["chorus","verse2"],
    ["intro"]
]
```
> `"flow"` : `[ String || [String] ]` - an array containing the song structure and how repeats should work in subsection arrays (see [Concepts](README.md#subsection))

## Tracks

*Location in file*
```
{
    "tracks": [ {} , ... ]
}
```

### Track data
```
{
	"name": "drums",
	"volumeDB": 0,
	"regions": {
        regionID : {}
    }
}
```
> `"name"` : String - track name

> `"volumeDB"` : float - default track volume in the mix

> `"regions"` : [Object] - description of regions that make up the track in time

### Track -> Region data
```
"lnkwgpz7" : {
    "bufferId":"lnkwgpyw"
    "bOffset":0
    "bDuration":1.5515999999940395
    "rOffset":0
    "rDuration":2.3273999999910595
}
```
> `"regionID"` : String - unique id refering to this region and the key from `"track"."regions"`

> `"bufferID"` : String - unique id refering to the sound file buffer which is used by this region

> `"bOffset"` : float - start time offset in the source buffer (`seconds`)

> `"bDuration"` :  float - total length of source buffer (`seconds`)

> `"rOffset"` : float - time offset when the region starts playing in the timeline (`beats`)

> `"rDuration"` : float - the amout of time the region plays for in the timeline (`beats`)
## Data 

*Location in file*
```
{
    "data": {
        bufferID : data
    }
}
```

Single entry:
```
{
    "lnkwgpyw" : "data:audio/wav;base64,UklGRi..."
}
```
> `"bufferID" : URL` - key is the unique buffer ID and value is either a URL or an encoded URI of an audio file

