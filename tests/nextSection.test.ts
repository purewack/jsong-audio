import getNextSectionIndex from "../src/nextSection";
import { SectionInfo } from "../src/types/player";

const sections = {
  0: {
    0: {
      0: {name:"A", index: [0,0,0], next: [0,0,1]},
      1: {name:"V", index: [0,0,1], next: [0,1]},
      loopCurrent: 0,
      loopLimit: 2,
      sectionCount: 2,
    },
    1: {name: "A", index:[0,1], next: [0,2], overrides: {fade: true, next: true}},
    2: {name: "B", index: [0,2], next: [1]},
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 3,
  },
  1: {name: "C", index: [1], next: [0,0,0]},
  loopCurrent: 0,
  loopLimit: Infinity,
  sectionCount: 2,
} as SectionInfo

test("Next - simple obey loop limits", () => {
  expect(getNextSectionIndex(sections, [0,0,0])).toStrictEqual([0,0,1]);
  expect(getNextSectionIndex(sections, [0,0,1])).toStrictEqual([0,0,0]);
  expect(getNextSectionIndex(sections, [0,1])).toStrictEqual([0,2]);
  expect(getNextSectionIndex(sections, [0,2])).toStrictEqual([0,0,0]);
  expect(getNextSectionIndex(sections, [1])).toStrictEqual([0,0,0]);
});

test("Next - break loop", () => {
  expect(getNextSectionIndex(sections, [0,0,1], true)).toStrictEqual([0,1]);
  expect(getNextSectionIndex(sections, [0,2], true)).toStrictEqual([1]);
  expect(getNextSectionIndex(sections, [1], true)).toStrictEqual([0,0,0]);
});

test("Next - non existant start index", ()=>{
  expect(getNextSectionIndex(sections, [20,99], true)).toBeUndefined();
  expect(getNextSectionIndex(sections, [20,99], false)).toBeUndefined();
})