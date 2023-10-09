# JSON-Audio

## *WIP*

<img alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/purewack/json-audio">
<a href="https://tonejs.github.io/"><img alt="Tone.js badge" src="https://img.shields.io/badge/Powered%20By-Tone.js-green"></a>

```mermaid
graph LR
  a[TrackA];
  b[TrackB];
  c[TrackC];
  ev["User Events (Scroll, Click ...)"]
  player[JSONPlayer]
  callbacks[Player Event Listeners]
  m[audio.json]

  a --> player
  b --> player
  c --> player
  m --> player
  m --> a
  m --> b
  m --> c
  player --> callbacks
  callbacks --> ev
  ev --> player
  player --> o[[Audio output]]
```

## A dynamic music representation and playback format.

### How does it work?
This format is designed specifically to provide dynamic instructions to music player *(a [`JSONPlayer`](API.md#control-methods) object)* on how to manage track volumes and looping of certain sections. The `*.audio.json` file itself has instructions on how to playback the music based on dynamic user input events, such as a page scroll, or mouse hover...
The `*.audio.json` file can also contain music encoded as data URI (coming soon)

### Inspiration
The idea came from two wonderful games, [TrackMania Turbo](https://www.ubisoft.com/en-gb/game/trackmania/turbo)) where the music has a different feel based on the speed of the car, and [Sonic Heroes' Mystic Mansion](https://sonic.fandom.com/wiki/Mystic_Mansion#Music) level where the music stays in different sections of music until you go to different parts of the level.

# API
Available in [API.md](API.md)

# Dependancies
As of now, the music player and event scheduler is <a href="https://tonejs.github.io/">Tone.js</a>. It provides music playback of multiple music streams, as well as schedules events aligned to musical time of the song based on its BPM.

# Concepts
The <code>audio.json</code> file describes how the player should play the music and how it should react to events. Below is a typical file structure 

<summary style="font-size:2rem"> <code>audio.json</code> - example file:</summary>
<pre>
{<span style="color: #987284;">
  "<a href="#file-information">type</a>": "jsonAudio",
  "jsonAudioVersion":"0.0.1",
  "<a href="#file-information">meta</a>": {
    "title": "Example JSONg",
    "author": "Damian Nowacki",
    "createdOn" : "20230325",
    "projectVersion": "1.0.0",
    "createdUsing": ""
  },</span>
  <span style="color: #A3333D;"><a href="#playback"><u>"playback</a>": {</u>
    "bpm": 95.0,
    "meter": [4, 4],
    "metronome": ["B5","G4"],
    "metronomeDB": -8,
    "length": 56,
    "grain": 4,
    <span style="color: #44CCFF;"><u>"<a href="#map">map</a>": {</u>
      "intro" : { "region": [0, 8]},
      "chorus" : { "region": [8, 24], "grain": 8},
      "verse1" : { "region": [24, 32]},
      "bridge1" : { "region": [32, 40], "grain": 2},
      "verse2" : { "region": [40, 56], "grain": 2}
    },</span>
    <span style="color: #5E4352;"><u>"<a href="#flow">flow"</a>: [</u>
      "intro", 
      "chorus", 
      "verse1", 
      "bridge1", 
      <u><a href="#subsection">[4, "verse2", "bridge1"],</a></u>
      <u><a href="#subsection">["chorus","verse2"],</a></u>
      <u><a href="#subsection">["intro"]</a></u>
    ]</span>
  },</span>
  <span style="color: #1B512D;">"<a href="#tracks">tracks</a>": [
    {
      "name": "drums",
      "volumeDB": 0,
      "regions" : {
        "r1" : {
          "bufferID" : "b1",
          "bOffset" : 0,
          "bDuration": 141.9,
          "rOffset": 0,
          "rDuration": 56
        }
      }
    },
    {
      "name": "bass",
      "volumeDB": 0,
      "regions" : {
        "r2" : {
          "bufferID" : "b2",
          "bOffset" : 0,
          "bDuration": 141.9,
          "rOffset": 0,
          "rDuration": 56
        }
      }
    }
  ],</span>
  "data" : {
    "b1": "data:audio/wav;base64,UklGRi...",
    "b2": "./bass.mp3"
  }
}
</pre>
<br/>

## File Information
<pre>
<span style="color: #987284;">"type": "jsonAudio",
    "jsonAudioVersion":"0.0.1",
    "meta": {
    "title": "Test",
    "author": "Damian Nowacki",
    "createdOn" : "20230325",
    "projectVersion": "1.0.0",
    "createdUsing": ""</span>
</pre>
These are basic information about the file and a compatible version of the player that can be used to play it back.
`jsonAudioVersion` shows which version of the interpreter is compatible for playback.

## Playback
<pre>
<span style="color: #A3333D;">"playback": {
    "bpm": 95.0,
    "meter": [4, 4],
    "metronome": ["B5","G4"],
    "metronomeDB": -8,
    "length": 56,
    "grain": 4,
</pre>
The playback object describes the player timeline information like the BPM of the song and the <a href="https://en.wikipedia.org/wiki/Time_signature">meter</a> it is in e.g. 4/4 or 6/8

The length of the song is provided in <a href="https://en.wikipedia.org/wiki/Bar_(music)">Bars</a>.
The grain is provided in <a href="https://en.wikipedia.org/wiki/Beat_(music)#:~:text=In%20music%20and%20music%20theory,level%20(or%20beat%20level).">Beats</a> and describes the granilarity of <a href="https://en.wikipedia.org/wiki/Quantization_(music)">Quantization</a> of the event scheduling, i.e. when it is appropriate to start the next section for example upon reacting to a user event that is not in time to music

## Map
<pre>
<span style="color: #44CCFF;">"map": {
    "intro"   : { "region": [0, 8]},
    "chorus"  : { "region": [8, 24], "grain": 8},
    "verse1"  : { "region": [24, 32], "grain": 4},
    "bridge1" : { "region": [32, 40], "grain": 4},
    "verse2"  : { "region": [40, 48], "grain": 4}
},</span>
</pre>

A song can be divided into re-usable regions.
Each of these sections has a name e.g. 'chorus'.
`region` has two values; `[startBar, endBar]` where the length of the section is defined within those timestamps.
The song <a href="https://en.wikipedia.org/wiki/Quantization_(music)">Quantization</a> can be overridden for a particular section to enable quicker or slower queueing up of next sections of music.

## Flow
<pre>
<span style="color: #5E4352;">flow": [
    "intro", 
    "chorus", 
    "verse1", 
    "bridge1", 
    <u><a href="#subsection">[4, "verse2", "bridge1"],</a></u>
    <u><a href="#subsection">["chorus","verse2"],</a></u>
    <u><a href="#subsection">["intro"]</a></u> ...
]</span>
</pre>

The `flow` of the song is mapped out with an array of literal names of sections from [`map`](#map), either a singleton entry or a sub array of section called a [sub-section](#subsection).

### Subsection
A subsection is like a Repeat in music, except you can specify how many time the section should repeat. `[4, "verse2", "bridge1"],` if no number is specified as the first entry, it is assumed the section repeats infinitely and can only be broken out of through [`JSONPlayer.next(breakout: boolean)`](API.md#jsonplayernextbreakout-regionname) or [`JSONPlayer.goTo(breakout: boolean, regionName: String)`](API.md#jsonplayernextbreakout-regionname)

## Tracks
<pre>
<span style="color: #1B512D;">"<a href="#tracks">tracks</a>": [
{
    "name": "drums",
    "source": "./drums.mp3",
    "volumeDB": 0,
    "regions" : {
      regionID_1: {},
      regionID_2: {},
      ...
    }
}, ...
</pre>

The name is a track name label serving as a reference, the regions describe how and when the track is to load music into [`Tone.Player`](https://tonejs.github.io/docs/14.7.77/Player.html).

## Data
This section contains either URL or data URI of actual sound files that make up the song