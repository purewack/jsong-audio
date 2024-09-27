import { FlowValue } from "./types/common";
import {PlayerSection, PlayerSections} from "./types/player"
import {parseFlowOverrides} from "./overrides"
import { JSONgSection } from "./types/jsong";

//example flow to build from:
// ["intro", "chorus", "verse1", [["bridge-X", "verse2"],"verse1"]]

//index edge case for beginning:
// [[["a"],"b"],"c"]
// start index should be [0,0,0]

export default function buildSection(flow: FlowValue[], map:{[key: string] : Pick<JSONgSection, 'region' | 'grain' | 'legato'>}, defaultGrain:number): PlayerSections {
  const buildFlowFrame = (sectionCount: number = 0, loopLimit: number = Infinity): PlayerSections => {
    return {
      sectionCount,
      loopCurrent: 0,
      loopLimit
    };
  };

  let currentIndex: number[] = [0];
  const entries: PlayerSection[] = [];

  const build = (sections: FlowValue[], depth: number = 0): PlayerSections => {
    const currentFlow: FlowValue = sections[0];
    const hasLimit = typeof currentFlow === "number" && depth !== 0;
    const sectionCount = hasLimit ? sections.length - 1 : sections.length;
    const _flows = buildFlowFrame(sectionCount, hasLimit ? (currentFlow as number) : undefined);

    for (let i = 0; i < sections.length; i++) {
      const entry = sections[i];
      const idx = hasLimit ? i - 1 : i;
      currentIndex[currentIndex.length - 1] = idx;
      if (Array.isArray(entry)) {
        currentIndex.push(0);
        _flows[i] = build(entry, depth + 1);
        currentIndex.pop();
      } else if (typeof entry !== "number") {
        const data = parseFlowOverrides(entry);
        const region = {grain:map[data.name].grain || defaultGrain, region:map[data.name].region};
        const legato = {legato: map[data.name]?.legato}
        const newEntry = { name: data.name, next: [], index: [...currentIndex], overrides: data.flags, ...region, ...legato};
        _flows[idx] = newEntry;
        entries.push(newEntry);
      }
    }
    if (depth) return _flows;
    return { ..._flows };
  };

  const structure = build(flow, 0) as PlayerSections;

  // Calculate next indices
  for (let i = 0; i < entries.length; i++) {
    const nextIndex = (i + 1) % entries.length;
    entries[i].next = entries[nextIndex].index;
  }

  return structure;
}