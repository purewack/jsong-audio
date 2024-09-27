import {getNextSectionIndex, findStart } from "../src/nextSection";
import { PlayerSection, PlayerSections } from "../src/types/player";

const sections: PlayerSections = {
  0: {
    0: {
      0: {name:"A", index: [0,0,0], next: [0,0,1],region:[0,0], grain:4},
      1: {name:"V", index: [0,0,1], next: [0,1],  region:[0,0], grain:4},
      loopCurrent: 0,
      loopLimit: 2,
      sectionCount: 2,
    },
    1: {name: "A", index:[0,1], next: [0,2],region:[0,0], grain:4, fade: true, once: true},
    2: {name: "B", index: [0,2], next: [1], region:[0,0], grain:4},
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 3,
  },
  1: {name: "C", index: [1], next: [0,0,0],region:[0,0], grain:4},
  loopCurrent: 0,
  loopLimit: Infinity,
  sectionCount: 2,
} 

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


test("Next - from current section", ()=>{
  const from = sections[1] as PlayerSection
  expect(getNextSectionIndex(sections, from, true)).toStrictEqual([0,0,0]);
})

test("Start - find start index of whole song", ()=>{
  expect(findStart(sections)).toStrictEqual([0,0,0]);
})

test("Start - non nested start sections beginning index", ()=>{
  const other: PlayerSections = {
    0: {name: "C", index: [0], next: [1], region:[0,0], grain:4},
    1: {
      0: {
        0: {name:"A", index: [1,0,0], next: [1,0,1], region:[0,0], grain:4},
        1: {name:"V", index: [1,0,1], next: [1,1],   region:[0,0], grain:4},
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
      },
      1: {name: "A", index:[1,1],  next: [1,2], region:[0,0], grain:4, fade: true, once: true},
      2: {name: "B", index: [1,2], next: [0],   region:[0,0], grain:4},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 3,
    },
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
  }

  expect(findStart(other)).toStrictEqual([0]);
})