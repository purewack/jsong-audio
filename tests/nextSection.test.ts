import {getNextSectionIndex, findStart } from "../src/sectionsNavigation";
import { PlayerSectionGroup } from "../src/types/player";
import { getNestedIndex } from "../src/util/nestedIndex";

describe("getNextSectionIndex",()=>{
  
  test("Start - find start index of whole song", ()=>{
    const sections: PlayerSectionGroup = {
      0: {
        0: {
          0: {name:"A", index: [0,0,0], next: [0,0,1], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          1: {name:"V", index: [0,0,1], next: [0,1],   region:[16,24], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
          loopCurrent: 1,
          loopLimit: 2,
          sectionCount: 2,
        },
        1: {name: "A", index:[0,1],  next: [0,2], region:[0,4],  grain:4, once:true , transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
        2: {name: "B", index: [0,2], next: [1],   region:[4,12], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        loopCurrent: 0,
        loopLimit: Infinity,
        sectionCount: 3,
      },
      1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }
    expect(findStart(sections)).toStrictEqual([0,0,0]);
  })


  test("shallow simple advancement ", () => {
    const sections: PlayerSectionGroup = {
      0: {name: "A", index: [0], next: [1], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      1: {name: "B", index: [1], next: [2], region:[16,24], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
      2: {name: "C", index: [2], next: [3], region:[0,4],  grain:4, once:true,   transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
      3: {name: "D", index: [3], next: [0], region:[4,12], grain:4, once:false,  transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 4,
    }

    expect(getNextSectionIndex(sections, [1])).toMatchObject({next:[2], increments: []});
    expect(getNextSectionIndex(sections, [3])).toMatchObject({next:[0], increments: [[]]});
  })

  test("right aligned advancement [[3,[2,A,V],A,B],C]", () => {
    const sections: PlayerSectionGroup = {
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
      0: {
        loopCurrent: 2,
        loopLimit: 3,
        sectionCount: 3,
        0: {
          loopCurrent: 1,
          loopLimit: 2,
          sectionCount: 2,
          0: {name:"A", index: [0,0,0], next: [0,0,1], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          1: {name:"V", index: [0,0,1], next: [0,1],   region:[16,24], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
        },
        1: {name: "A", index:[0,1],  next: [0,2], region:[0,4],  grain:4, once:true, transitionSync:false,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
        2: {name: "B", index: [0,2], next: [1],   region:[4,12], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      },
      1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      
    }

    expect(getNextSectionIndex(sections, [0,0,0])).toMatchObject({next:[0,0,1],increments:[]});
    expect(getNextSectionIndex(sections, [0,0,1])).toMatchObject({next:[0,1],increments:[[0,0]]});
    expect(getNextSectionIndex(sections, [0,1])).toMatchObject({next:[0,2], increments:[]});
    expect(getNextSectionIndex(sections, [0,2])).toMatchObject({next:[1], increments:[[0]]});
    expect(getNextSectionIndex(sections, [1])).toMatchObject({next:[0,0,0], increments:[[]]});

  });
  
  test("central padded advancement [[4,A,[2,AA,VV]],C]", () => {
    const sections: PlayerSectionGroup = {
      0: {
        0: {name: "A", index:[0,0],  next: [0,1,0], region:[0,4],  grain:4, once:true, transitionSync:false,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
        1: {
          0: {name:"AA", index: [0,1,0], next: [0,1,1], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          1: {name:"VV", index: [0,1,1], next: [1],   region:[16,24], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
          loopCurrent: 1,
          loopLimit: 2,
          sectionCount: 2,
        },
        loopCurrent: 1,
        loopLimit: 4,
        sectionCount: 2,
      },
      1: {name: "C", index: [1], next: [0,0], region:[12,16], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }

    expect(getNextSectionIndex(sections, [0,0])).toMatchObject({next:[0,1,0],increments:[]});
    expect(getNextSectionIndex(sections, [0,1,1])).toMatchObject({next:[0,0],increments:[[0,1],[0]]});
    
  });


  test("double advancement [[4,A,[2,AA,VV]],C]", () => {
    const sections: PlayerSectionGroup = {
      0: {
        0: {name: "A", index:[0,0],  next: [0,1,0], region:[0,4],  grain:4, once:true, transitionSync:false,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
        1: {
          0: {name:"AA", index: [0,1,0], next: [0,1,1], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          1: {name:"VV", index: [0,1,1], next: [1],   region:[16,24], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
          loopCurrent: 1,
          loopLimit: 2,
          sectionCount: 2,
        },
        loopCurrent: 3,
        loopLimit: 4,
        sectionCount: 2,
      },
      1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }

    // expect(getNextSectionIndex(sections, [0,0])).toMatchObject({next:[0,1,0],increments:[]});
    expect(getNextSectionIndex(sections, [0,1,1])).toMatchObject({next:[1],increments:[[0,1],[0]]});
    
  });


  test("complex advancement jump from group to group [[2,A,V],[3,[5,C.CC],D]]", () => {
    const sections: PlayerSectionGroup = {
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
      0: {
        loopCurrent: 1,
        loopLimit: 2,
        sectionCount: 2,
        0: {name:"A", index: [0,0], next: [0,1], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        1: {name:"V", index: [0,1], next: [1,0], region:[16,24], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
      },
      1: {
        loopCurrent: 1,
        loopLimit: 3,
        sectionCount: 2,
        0: {name:"C", index: [1,0], next: [1,1], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        1: {name:"D", index: [1,1], next: [0,0], region:[16,24], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
      },
    }

    expect(getNextSectionIndex(sections, [0,0])).toMatchObject({next:[0,1],increments:[]});
    expect(getNextSectionIndex(sections, [0,1])).toMatchObject({next:[1,0],increments:[[0]]});
    expect(getNextSectionIndex(sections, [1,1])).toMatchObject({next:[1,0],increments:[[1]]});

  });



  test("complex advancement jump from group to group to start [[2,A,V],[3,[5,C.CC],D]]", () => {
    const sections: PlayerSectionGroup = {
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
      0: {
        loopCurrent: 1,
        loopLimit: 2,
        sectionCount: 2,
        0: {name:"A", index: [0,0], next: [0,1], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        1: {name:"V", index: [0,1], next: [1,0], region:[16,24], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
      },
      1: {
        loopCurrent: 2,
        loopLimit: 3,
        sectionCount: 2,
        0: {name:"C", index: [1,0], next: [1,1], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        1: {name:"D", index: [1,1], next: [0,0], region:[16,24], grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
      },
    }

    expect(getNextSectionIndex(sections, [0,0])).toMatchObject({next:[0,1],increments:[]});
    expect(getNextSectionIndex(sections, [0,1])).toMatchObject({next:[1,0],increments:[[0]]});
    expect(getNextSectionIndex(sections, [1,1])).toMatchObject({next:[0,0],increments:[[1],[]]});

  });


  test("Edge case multi nest single entry advancement", () => {
    const sections: PlayerSectionGroup = {
      0: {
        0: {
          0: {name:"A", index: [0,0,0], next: [0,0,0], region:[0,4],   grain:4, once:false, transitionSync:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          loopCurrent: 1,
          loopLimit: 2,
          sectionCount: 1,
        },
        loopCurrent: 2,
        loopLimit: 3,
        sectionCount: 1,
      },
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 1,
    }

    expect(getNextSectionIndex(sections, [0,0,0])).toMatchObject({next:[0,0,0],increments:[[0,0],[0],[]]});
    
  });

})


