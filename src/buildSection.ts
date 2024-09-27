import {PlayerSection, PlayerSectionOverrides, PlayerSections} from "./types/player"
import {splitSectionName} from "./overrides"
import { JSONgFlowEntry } from "./types/jsong";

//example flow to build from:
// ["intro", "chorus", "verse1", [["bridge-X", "verse2"],"verse1"]]

//index edge case for beginning:
// [[["a"],"b"],"c"]
// start index should be [0,0,0]

export default function buildSections(
  flow: JSONgFlowEntry[], 
  map:{[key: string]: [number,number]}, 
  sectionDefaults: {
    grain: number
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
        let newEntry:any = {}
        let splitName: {
            name: string;
            flags?: PlayerSectionOverrides;
        };
        
        newEntry.grain = sectionDefaults.grain
        if(typeof entry === "object"){
          splitName = splitSectionName(entry.name)
          newEntry.grain =  entry?.grain || sectionDefaults.grain
          if(entry.fade) newEntry.fade = entry.fade
          if(entry.once) newEntry.once = entry.once
          if(entry.grain) newEntry.grain = entry.grain
        }
        else{
          splitName = splitSectionName(entry);
          if(splitName.flags)
            newEntry = {...newEntry, ...splitName.flags}
        }

        const name = splitName.name
        newEntry.name = name
        newEntry.region = map[name]
        newEntry.index = [...currentIndex]
         
        _sections[idx] = newEntry as PlayerSection;
        _orderedEntries.push(newEntry);
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