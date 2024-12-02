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

This is the default information that is first checked by the parser. File type and version identifier, required to be classed as a JSONg
```json
"type": "jsong",
"version":"J/1",
```


# Metadata Information

*Location in file and example definition*
```json
{
    "meta": {
        "title": "Test",
        "author": "Damian Nowacki",
        "created" : "20230325",
        "modified" : "1679741210",
        "version": "1.0.0",
        "createdUsing": "melonjuice",
        "meta": "extra metadata information or description..."
    },
}
```

> Song title and creator details.

# Playback Information

*Location in file and example definition*
```json
{
    "playback":  {
        "bpm": 95.0,
        "meter": [4, 4],
        "grain": 4,
        "metronome": {"high":"B5","db":-12},
        "audioOffsetSeconds": 0.049,
        "map": {...},
        "flow": [...]
    }
}
```

> `"bpm" : number` - determines the tempo of the song's metronome and the timing of events, very critical that it matches the actual tempo of recordings. Required as a minimum to function correctly

> `"meter?" : [number, number]` - also known as a [Time Signature](https://en.wikipedia.org/wiki/Time_signature), used for timing of events, first entry is the number of beats in bar, second is the length of each beat, assumed 4/4 if missing 

> `"audioOffsetSeconds?" : number` - default audio offset to apply to all tracks. If tracks contain their own offset value, this one is not applied to that track

> `"grain?" : number` - the default timing quantization in beats, if not defined, the default is taken from the meter to equal one bar length. If a flow section contains its own grain value, this one is not applied.

> `"metronome?" : {db?: number, high?: string, low?: string} | boolean` - You can set the flag to either true or false to specify if the debug metronome is present, or you can supply details of the metronome like which notes are played and at what volume.



## Map

*Location in file and example definition*
```json
{
    "playback": {
        "map": {
            "intro" : [0, 8],
            "chorus" : [8, 24],
            "verse1" : [24, 32],
        },
    }
}
```

> `string : [number, number]` - a named section that is then referenced in the flow.
Defines a loop area for a section, start and end points are measured in bars. A bar is the number of beats from the time signature. if you have a 6/8 time signature then 1 bar would be 6 beats. 


## Flow

*Location in file and example definition*
```json
{
    "playback": {
        "flow": [
            "intro->", 
            {"name":"chorus", "grain":8}, 
            "verse1", 
            "bridge1", 
            [4, "verse2-x", "bridge1"],
            [
                ["chorus","verse2",2],
                {"name":"chorus-x","once":true}, 
            ]
        ]
    }
}
```

`"flow" : (string | number | object | flow)[]` - an array containing the song structure and how repeats should work in subsection arrays (see [Concepts](../README.md#subsection)).
Nesting level is not limited, therefore you can include arrays in arrays.

If a flow entry as an `Array` then this is classed as a group. This group can have a repeat limit set with a number as any of its own entries. 

The player will cycle through all elements one by one. If it encouters a group, it will enter it and stay there until either the repeat limit is reached, or [`JSONg.continue(true) | JSONg.continue(PlayerIndex)`](API.md#async-continuebreakout-boolean--playerindex--false-promisevoid) is issued.


If a flow entry is a `number` then this sets the repeat limit for the group that the number is in. You cannot set the repeat counter for the root array as that is always forced to `Infinity`.

If a flow entry is a `string`, the string should reference a section defined in the `map` portion of the manifest. The name can also contain shorthand directives that change the way this section behaves, they should be `-` separated and can include: 
- `x` or `X`, meaning to crossfade into the next section smoothly
- `|` meaning a *legato* transition, that means a cross fade with no fade time. Essentially the next section will start at the same point there the current section is. e.g. if the current section is 70% done, the next section will start at **its** 70% mark, the same happens for regular crossfades.
- `>` to play this section only once and not loop it. The player will automatically queue the next section when this one starts. You can cancel this scheduling manually with [`JSONg.cancel()`](API.md#cancel)

As an example a section named `bridge-X` will crossfade into the next section when [`JSONg.continue()`](API.md#async-continuebreakout-boolean--playerindex--false-promisevoid) is issued


If a flow entry is an `object` then it can contain these properties:
> `"name" : string` - name of section to use, from [`"map"`](#map)

> `"grain" : number` - defines the granularity of the triggering, i.e. in how many beats the next action in queue can take place. Unit is in beats. If property is not defined, the global setting takes precedence, defined in [`"playback"`](#playback-information)

> `"once" : boolean` - if true, the section will play only once and not repeat over and over. Player will automatically advance forward unless cancelled.

> `"legato" : boolean`, jump to next section immediately and land at the same spot. Mutually exclusive with `"fade"`

>`"fade" : boolean | number | string[] | { name: string, duration: number}[]` defines exact cross fade instructions. Mutually exclusive with `"legato"`. If both defined, this takes precedence.
> - `true` means all tracks fade using default timing parameters derived from > the time signature.
> - `number` means fade all track using the time provided, in sections
> - `string[]` tells the player which named tracks should fade. Unlisted > tracks fade using the *legato* technique, i.e. 0 fade time.
> - `object[]` can specify name of track and fade duration, per track.



## Tracks

*Location in file and example data*
```json
{
    "tracks": [ 
        {
            "name": "drums",
            "db": 0,
            "audioOffsetSeconds":0,
            "source" : "lnkwgpyw"
        },
        {
            "name": "melody",
            "db": -6
        },
        "guitar"
    ]
}
```

Track entries can either be `string` names, which refer to a source file using its name, or an object with explicit name and source (if provided, else its name is used as source key again). 

If entry is an object:
> `"name": string` - track name

> `"db": number`- default track volume in the mix

> `"audioOffsetSeconds": number`- a time offset used to align audio sources to the metronome click.

> `"source": string` - optional name of the source file, if not specified, the track name is used instead to refer to a buffer


## Sources 

*Location in file and example data*
```json
{
    "sources": {
        "lnkwgpyh" : "./bass.mp3",
        "drums" : "drum.mp3",
        "lnkwgpyw" : "data:audio/wav;base64,UklGRi..."
    }
}
```
A map of audio sources used by the song.

Paths prepended with `./` are relative paths to the manifest file, for the internal `fetch()` function, a baseURL is prepended in the form of the relative path to the manifest.

Paths with no prefix but not a `data` URI are treated as paths to the `public/` dir or appended to an `origin` URL provided when loading the manifest into player. 

You can also specify an absolute URL to a completely external source, but be careful sourcing from different origins and CORS issues.
 
> `"bufferID" : URL` - key is the unique buffer ID and value is either a URL or an encoded URI of an audio file.
