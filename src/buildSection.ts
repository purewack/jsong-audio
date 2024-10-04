import {PlayerSection, PlayerSections} from "./types/player"
import {splitSectionName} from "./overrides"
import { JSONgFlowEntry, JSONgFlowInstruction } from "./types/jsong";
import { split } from "lodash";

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
    fadeDuration: number
  })
: PlayerSections {

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

    const currentValue = sections[0];
    const hasLimit = typeof currentValue === "number" && depth !== 0;
    const sectionCount = hasLimit ? sections.length - 1 : sections.length;
    const _sections = _buildFlowFrame(sectionCount, hasLimit ? (currentValue as number) : undefined);

    for (let i = 0; i < sections.length; i++) {
      const entry = sections[i];
      const idx = hasLimit ? i - 1 : i;
      currentIndex[currentIndex.length - 1] = idx;

      if (Array.isArray(entry)) {
        //nested repeat section, iterate recurse
        currentIndex.push(0);
        _sections[i] = _buildSection(entry, depth + 1);
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
        }
        let splitName;
        
        if(typeof entry === "object"){ //JSONgFlowInstruction
          const split = splitSectionName(entry.name);
          newEntry.name = split.name;
          newEntry.grain =  entry?.grain || sectionDefaults.grain
          newEntry.once = entry?.once || split.once || false
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
        }

        newEntry.region = map[newEntry.name]
        newEntry.index = [...currentIndex]
         
        _sections[idx] = newEntry ;
        _orderedEntries.push(newEntry as PlayerSection);
      }
    }
    if (depth) return _sections;
    return { ..._sections };
  };

  const structure = _buildSection(flow, 0);

  // Calculate next indices
  for (let i = 0; i < _orderedEntries.length; i++) {
    const nextIndex = (i + 1) % _orderedEntries.length;
    _orderedEntries[i].next = _orderedEntries[nextIndex].index;
  }

  return structure as PlayerSections;
}