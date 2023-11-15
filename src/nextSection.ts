import { setNestedIndex, getNestedIndex } from './nestedIndex'
import { SectionType } from './types';

export default function nextSection(
  topLevel: SectionType, 
  breakLoop: boolean = false
) {
  const traverse = (sec: SectionType) => {
    if(topLevel?.index === undefined) topLevel.index = [0]

    const r = getNestedIndex(topLevel, topLevel.index);
    // console.log(">", r, topLevel.index);
    if (r === undefined) {
      if (topLevel.index.length > 1) {
        const prevIndex = topLevel.index.slice(0, -1);
        const prevSection = getNestedIndex(topLevel, prevIndex);
        // console.log("-nested index loop", prevIndex, prevSection);
        // console.log("loop");
        if(prevSection === undefined) return

        if (prevSection.loop + 1 < prevSection.loopLimit && !breakLoop) {
          topLevel.index[topLevel.index.length - 1] = 0;
          prevSection.loop += 1;
          // console.log("inlimt");

          // console.log("--loop", prevSection, prevIndex);
          setNestedIndex({ ...prevSection }, topLevel, prevIndex);
        } else {
          // console.log("endlimit");
          prevSection.loop = 0;
          setNestedIndex({ ...prevSection }, topLevel, prevIndex);
          topLevel.index.pop();
          topLevel.index[topLevel.index.length - 1] += 1;
        }
        traverse(sec);
      } else {
        // console.log("root index loop");
        topLevel.index = [0];
        traverse(sec);
        return;
      }
    } else if (typeof r === "object") {
      topLevel.index.push(0);
      // console.log(">> obj", topLevel.index);
      traverse(sec);
    } else if (typeof r === "string") {
      // console.log(">>>>>>>>>>>>>>found next", r, sec.index);
      return;
    }
  };

  if(topLevel?.index === undefined) topLevel.index = [0]
  topLevel.index[topLevel.index.length - 1] += 1;
  traverse(topLevel);
}
