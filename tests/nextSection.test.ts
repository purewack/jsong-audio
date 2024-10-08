import {getNextSectionIndex, findStart, repeatMarkerCheck } from "../src/sectionsNavigation";
import { PlayerSection, PlayerSections } from "../src/types/player";
import { getNestedIndex } from "../src/util/nestedIndex";

describe("getNextSectionIndex",()=>{
  const sections: PlayerSections = {
    0: {
      0: {
        0: {name:"A", index: [0,0,0], next: [0,0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        1: {name:"V", index: [0,0,1], next: [0,1],   region:[16,24], grain:4, once:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
      },
      1: {name: "A", index:[0,1],  next: [0,2], region:[0,4],  grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
      2: {name: "B", index: [0,2], next: [1],   region:[4,12], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 3,
    },
    1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
  }

  test("Next simple advancement", () => {
    expect(getNextSectionIndex(sections, [0,0,0])).toStrictEqual([0,0,1]);
    expect(getNextSectionIndex(sections, [0,0,1])).toStrictEqual([0,1]);
    expect(getNextSectionIndex(sections, [0,1])).toStrictEqual([0,2]);
    expect(getNextSectionIndex(sections, [0,2])).toStrictEqual([1]);
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
    expect(getNextSectionIndex(sections, from.index, true)).toStrictEqual([0,0,0]);
  })

  test("Start - find start index of whole song", ()=>{
    expect(findStart(sections)).toStrictEqual([0,0,0]);
  })

  test("Start - non nested start sections beginning index", ()=>{
    const other: PlayerSections = {
      0: {name:"A", index: [0], next: [1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      1: {name: "C", index: [1], next: [0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }

    expect(findStart(other)).toStrictEqual([0]);
  })
})



describe("navigate section loop counter limit reached", ()=>{
  
  test("Next from [1,1,1] -> [1,0] not [0]", () => {
    //[A, [B,[C,D]]]
    const sections: PlayerSections = {
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
      0: {name:"A", index: [0], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
      1: {
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
        0: {name: "B", index: [1,0], next: [1,1,0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        1: {
          loopCurrent: 2,
          loopLimit: 3,
          sectionCount: 2,
          0: {name: "C", index: [1,1,0], next: [1,1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
          1: {name: "D", index: [1,1,1], next: [0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        },
      },
    }
  
    expect(getNextSectionIndex(sections, [1,1,1])).toStrictEqual([1,0]);
  })

  test("Next from [1,1,1] -> [1,0] not [0]", () => {
     //[[A,AA], [B,[C,D]]]
     const sections: PlayerSections = {
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
      0: {
        loopCurrent: 3,
        loopLimit: 4,
        sectionCount: 2,
        0: {name:"A", index: [0,0], next: [0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        1: {name:"AA", index: [0,1], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
      },
      1: {
        loopCurrent: 1,
        loopLimit: 2,
        sectionCount: 2,
        0: {name: "B", index: [1,0], next: [1,1,0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        1: {
          loopCurrent: 2,
          loopLimit: 3,
          sectionCount: 2,
          0: {name: "C", index: [1,1,0], next: [1,1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
          1: {name: "D", index: [1,1,1], next: [0,0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        },
      },
    }
  
  
    expect(getNextSectionIndex(sections, [0,1])).toStrictEqual([1,0]);
  })
 
  test("Next from [1,1,1] final loop on all", () => {
    //[A, [B,[C,D]]]
    const sections: PlayerSections = {
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
      0: {name:"A", index: [0], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
      1: {
        loopCurrent: 1,
        loopLimit: 2,
        sectionCount: 2,
        0: {name: "B", index: [1,0], next: [1,1,0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        1: {
          loopCurrent: 2,
          loopLimit: 3,
          sectionCount: 2,
          0: {name: "C", index: [1,1,0], next: [1,1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
          1: {name: "D", index: [1,1,1], next: [0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        },
      },
    }
  
    expect(getNextSectionIndex(sections, [1,1,1])).toStrictEqual([0]);
  })


  test("Next from [1,1,1] back to [0,0] as all loops finish", () => {
    //[[A,AA], [B,[C,D]]]
    const sections: PlayerSections = {
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
      0: {
        loopCurrent: 0,
        loopLimit: 4,
        sectionCount: 2,
        0: {name:"A", index: [0,0], next: [0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        1: {name:"AA", index: [0,1], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
      },
      1: {
        loopCurrent: 1,
        loopLimit: 2,
        sectionCount: 2,
        0: {name: "B", index: [1,0], next: [1,1,0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        1: {
          loopCurrent: 2,
          loopLimit: 3,
          sectionCount: 2,
          0: {name: "C", index: [1,1,0], next: [1,1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
          1: {name: "D", index: [1,1,1], next: [0,0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        },
      },
    }
  
    expect(getNextSectionIndex(sections, [1,1,1])).toStrictEqual([0,0]);
  })
})


describe("will section loop counter increase", ()=>{
  const sections: PlayerSections = {
    0: {name:"A", index: [0], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
    1: {
      loopCurrent: 0,
      loopLimit: 2,
      sectionCount: 2,
      0: {name: "AA", index: [1,0], next: [1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
      1: {name: "BB", index: [1,1], next: [0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
    },
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
  }

  test("normal advance exit repeat",()=>{
    expect(repeatMarkerCheck(getNestedIndex(sections,[1,1]))).toMatchObject({enterLoop: false, exitLoop: true})
  })
  test("normal advance repeat non loop end",()=>{
    expect(repeatMarkerCheck(getNestedIndex(sections,[1,0]))).toMatchObject({enterLoop: false, exitLoop: false})
  })
  test("normal advance enter repeat ",()=>{
    expect(repeatMarkerCheck(getNestedIndex(sections,[0]))).toMatchObject({enterLoop: true, exitLoop: false})
  })
})

describe("will section loop counter increase", ()=>{
  const sections: PlayerSections = {
    0: {name:"A", index: [0], next: [1,0,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
    1: {
      loopCurrent: 0,
      loopLimit: 2,
      sectionCount: 2,
      0: {
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
        0: {name: "AAA", index: [1,0,0], next: [1,0,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
        1: {name: "BBB", index: [1,0,1], next: [1,1],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
      },
      1: {name: "AA", index: [1,1], next: [1,2], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
      2: {name: "BB", index: [1,2], next: [0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
    },
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
  }

  test("complex advance enter inner repeat",()=>{
    expect(repeatMarkerCheck(getNestedIndex(sections,[1,0,1]))).toMatchObject({enterLoop: false, exitLoop: true})
  })
  test("complex advance enter outer repeat",()=>{
    expect(repeatMarkerCheck(getNestedIndex(sections,[1,2]))).toMatchObject({enterLoop: false, exitLoop: true})
  })
  test("complex advance enter repeat",()=>{
    expect(repeatMarkerCheck(getNestedIndex(sections,[0]))).toMatchObject({enterLoop: true, exitLoop: false})
  })
  test("complex advance repeat non loop end",()=>{
    expect(repeatMarkerCheck(getNestedIndex(sections,[1,0,0]))).toMatchObject({enterLoop: false, exitLoop: false})
  })
  test("complex advance repeat non loop end outer",()=>{
    expect(repeatMarkerCheck(getNestedIndex(sections,[1,1]))).toMatchObject({enterLoop: false, exitLoop: false})
  })
})

