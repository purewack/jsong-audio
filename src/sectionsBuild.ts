import {PlayerSection, PlayerSectionGroup} from "./types/player"
import { JSONgFlowEntry, JSONgFlowInstruction } from "./types/jsong";
import _ from 'lodash'
//example flow to build from:
// ["intro", "chorus", "verse1", [["bridge-X", "verse2"],"verse1"]]

//index edge case for beginning:
// [[["a"],"b"],"c"]
// start index should be [0,0,0]

export default function buildSections(
  flow: JSONgFlowEntry[], 
  map:{[key: string]: [number,number]}, 
  sectionDefaults: {
    grain: number,
    tracks: string[],
    fadeDuration: number,
    beatsInMeasure: number,
  })
: PlayerSectionGroup {

  const checkZero = map[Object.keys(map)?.[0]]
  if(!Array.isArray(checkZero)){
    throw new Error("[build] invalid map definition")
  }
  // console.log("[build] using map",map)

  const _buildFlowFrame = (sectionCount: number = 0, loopLimit: number = Infinity):any=> {
    return {
      sectionCount,
      loopCurrent: 0,
      loopLimit
    };
  };

  let currentIndex: number[] = [0];
  const _orderedEntries: PlayerSection[] = [];

  const _buildSection = (sections: JSONgFlowEntry[], depth: number = 0) => {

    let loopLimit = Infinity
    let strippedSections: JSONgFlowEntry[] = []
    sections.forEach(s => {
      if(typeof s === 'number') loopLimit = s
      else strippedSections.push(s)
    })
    const _frame = _buildFlowFrame(strippedSections.length, loopLimit);
    

    for (let i = 0; i < strippedSections.length; i++) {
      const entry = strippedSections[i];
      currentIndex[currentIndex.length - 1] = i;

      if (Array.isArray(entry)) {
        //nested repeat section, iterate recurse
        currentIndex.push(0);
        _frame[i] = _buildSection(entry, depth + 1);
        currentIndex.pop();

      } else if (typeof entry !== "number") {
        let newEntry: PlayerSection 

        const transitionDefaults = sectionDefaults.tracks.map(t=>({
          name: t,
          type: "sync" as const,
          duration: 0
        }))
        function allTracksLegato(){
          newEntry.transition = newEntry.transition.map(tr => ({...tr, type:'fade',duration: 0}))
        }
        function allTracksFade(duration?: number){
          newEntry.transition = newEntry.transition.map(tr => ({...tr, type:'fade' as const, duration: duration || sectionDefaults.fadeDuration}))
        }
        function perTrackFade(track: {name:string, duration:number}, duration?:number){
          return {...track, type: "fade" as const, duration: duration || sectionDefaults.fadeDuration}
        }

        newEntry = {
          name: '',
          region: [0,0],
          index: [],
          next: [],
          grain: sectionDefaults.grain,
          once: false,
          transition: transitionDefaults,
          sync: false,
        }
        let splitName;
        
        if(typeof entry === "object"){ //JSONgFlowInstruction
          const split = splitSectionName(entry.name);
          newEntry.name = split.name;
          newEntry.grain =  entry?.grain !== undefined ? entry.grain : sectionDefaults.grain
          newEntry.once = entry?.once || split.once || false
          newEntry.sync = entry?.sync || split.sync || false
          
          if(newEntry.grain === 0){
            newEntry.grain = map[newEntry.name][1] - map[newEntry.name][0]
            newEntry.grain *= sectionDefaults.beatsInMeasure
          }
          if(entry?.fade || split.fade) {
            if(split.fade || (typeof entry.fade === 'boolean' && entry.fade === true))
              allTracksFade()
            else if(typeof entry.fade === 'number') //override transition time
              allTracksFade(entry.fade)
            else if(Array.isArray(entry.fade)){ //array of string or object
              entry.fade.forEach(f => {
                if(typeof f === 'object'){ // fade object
                  newEntry.transition = newEntry.transition.map((track)=>track.name === f.name ? perTrackFade(track,f.duration) : track)
                }
                else if(typeof f === 'string'){ //fade string 
                  newEntry.transition = newEntry.transition.map(track => track.name === f ? perTrackFade(track) : track)
                }
              })
            }
          }
          else if(entry?.legato || split.legato){
            allTracksLegato()
          }
        }
        else{ //JSONgFlowInstruction string, can contain '>', 'x', '|'
          splitName = splitSectionName(entry);
          newEntry.name = splitName.name
          if(splitName?.legato){
            allTracksLegato()
          }
          else if(splitName.fade){
            allTracksFade()
          }
          if(splitName.once)
            newEntry.once = true
          if(splitName.sync)
            newEntry.sync = true
        }

        newEntry.region = map[newEntry.name]
        newEntry.index = [...currentIndex]

        if(newEntry.grain > (newEntry.region[1]-newEntry.region[0])*sectionDefaults.beatsInMeasure){
          newEntry.grain = (newEntry.region[1]-newEntry.region[0])*sectionDefaults.beatsInMeasure
        }
         
        _frame[i] = newEntry ;
        _orderedEntries.push(newEntry as PlayerSection);
      }
    }
    if (depth) return _frame;
    return { ..._frame };
  };

  const structure = _buildSection(flow, 0);

  // Calculate next indices
  for (let i = 0; i < _orderedEntries.length; i++) {
    const nextIndex = (i + 1) % _orderedEntries.length;
    _orderedEntries[i].next = _orderedEntries[nextIndex].index;
  }

  structure.loopLimit = Infinity

  return structure as PlayerSectionGroup;
}


//Extraction of flow directives
export function splitSectionName(name: string) { 
  const k = name.split('-')
  const extra = k.length > 1
  const fade = extra ? _.includes(k, 'X') || _.includes(k, 'x') : undefined
   
  return {
      name: k[0],
      fade,
      once: extra ? _.includes(k, '>') : undefined,
      legato: extra ? _.includes(k, '|') && !fade : undefined,
      sync: extra ? _.includes(k, '@') : undefined
  }
}
