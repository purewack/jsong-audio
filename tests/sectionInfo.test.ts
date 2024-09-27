import {getIndexInfo, setIndexInfo} from "../src/indexInfo";
import { PlayerSections } from "../src/types/player";

let sections = {
  0: {name:"intro", index: [0], next: [1,0,0], region:[0,4], grain:4},
  1: {
    0: {
      0: {name:"chorus", index: [1,0,0], next: [1,0,1], region:[4,8], grain:16},
      1: {name:"verse",  index: [1,0,1], next: [1,1], region:[8,12], grain:4},
      loopCurrent: 0,
      loopLimit: 2,
      sectionCount: 2,
    },
    1: {name:"bass", index: [1,1], next:[0], region:[12,16], grain:4},
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
  },
  loopCurrent: 0,
  loopLimit: Infinity,
  sectionCount: 2,
} as PlayerSections


test("top level", () => {
  const a = setIndexInfo({loopCurrent:1},sections,[0])!
  expect(getIndexInfo(a,[0])).toMatchObject(
    {
      0: {name:"intro", index: [0]},
      1: {
        0: {
          0: {name:"chorus", index: [1,0,0]},
          1: {name:"verse",  index: [1,0,1]},
          loopCurrent: 0,
          loopLimit: 2,
          sectionCount: 2,
        },
        1: {name:"bass", index: [1,1]},
        loopCurrent: 0,
        loopLimit: Infinity,
        sectionCount: 2,
      },
      loopCurrent: 1,
      loopLimit: Infinity,
      sectionCount: 2,
    }
  )
});

test("get deep level", ()=>{
  expect(getIndexInfo(sections,[1,0,1])).toMatchObject(
    {
      0: {name:"chorus", index: [1,0,0]},
      1: {name:"verse",  index: [1,0,1]},
      loopCurrent: 0,
      loopLimit: 2,
      sectionCount: 2,
    }
  )
})

test("2nd level", () => {
  const a = setIndexInfo({loopCurrent:2},sections,[1,1])!
  expect(a).toMatchObject(
    {
      0: {name:"intro", index: [0]},
      1: {
        0: {
          0: {name:"chorus", index: [1,0,0]},
          1: {name:"verse",  index: [1,0,1]},
          loopCurrent: 0,
          loopLimit: 2,
          sectionCount: 2,
        },
        1: {name:"bass", index: [1,1]},
        loopCurrent: 2,
        loopLimit: Infinity,
        sectionCount: 2,
      },
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }
  )
});

test("3rd level", () => {
  const a = setIndexInfo({loopCurrent:6},sections,[1,0,0])!
  expect(a).toMatchObject(
    {
      0: {name:"intro", index: [0]},
      1: {
        0: {
          0: {name:"chorus", index: [1,0,0]},
          1: {name:"verse",  index: [1,0,1]},
          loopCurrent: 6,
          loopLimit: 2,
          sectionCount: 2,
        },
        1: {name:"bass", index: [1,1]},
        loopCurrent: 0,
        loopLimit: Infinity,
        sectionCount: 2,
      },
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }
  )
});

