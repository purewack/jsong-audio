import {getNextSectionIndex, findStart, repeatMarkerCheck } from "../src/sectionsNavigation";
import { PlayerSection, PlayerSections } from "../src/types/player";
import { getNestedIndex } from "../src/util/nestedIndex";

describe("getNextSectionIndex",()=>{
  
  // test("Start - find start index of whole song", ()=>{
  //   const sections: PlayerSections = {
  //     0: {
  //       0: {
  //         0: {name:"A", index: [0,0,0], next: [0,0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //         1: {name:"V", index: [0,0,1], next: [0,1],   region:[16,24], grain:4, once:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
  //         loopCurrent: 1,
  //         loopLimit: 2,
  //         sectionCount: 2,
  //       },
  //       1: {name: "A", index:[0,1],  next: [0,2], region:[0,4],  grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
  //       2: {name: "B", index: [0,2], next: [1],   region:[4,12], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //       loopCurrent: 0,
  //       loopLimit: Infinity,
  //       sectionCount: 3,
  //     },
  //     1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //     loopCurrent: 0,
  //     loopLimit: Infinity,
  //     sectionCount: 2,
  //   }
  //   expect(findStart(sections)).toStrictEqual([0,0,0]);
  // })


  // test("Shallow simple advancement", () => {
  //   const sections: PlayerSections = {
  //     0: {name: "A", index: [0], next: [1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //     1: {name: "B", index: [1], next: [2], region:[16,24], grain:4, once:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
  //     2: {name: "C", index: [2], next: [3], region:[0,4],  grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
  //     3: {name: "D", index: [3], next: [0], region:[4,12], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //     loopCurrent: 0,
  //     loopLimit: Infinity,
  //     sectionCount: 2,
  //   }

  //   expect(getNextSectionIndex(sections, [1])).toMatchObject({next:[2]});
  //   expect(getNextSectionIndex(sections, [3])).toMatchObject({next:[0]});
  // })

  // test("Next simple advancement", () => {
  //   const sections: PlayerSections = {
  //     loopCurrent: 0,
  //     loopLimit: Infinity,
  //     sectionCount: 2,
  //     0: {
  //       loopCurrent: 2,
  //       loopLimit: 3,
  //       sectionCount: 3,
  //       0: {
  //         loopCurrent: 1,
  //         loopLimit: 2,
  //         sectionCount: 2,
  //         0: {name:"A", index: [0,0,0], next: [0,0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //         1: {name:"V", index: [0,0,1], next: [0,1],   region:[16,24], grain:4, once:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
  //       },
  //       1: {name: "A", index:[0,1],  next: [0,2], region:[0,4],  grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
  //       2: {name: "B", index: [0,2], next: [1],   region:[4,12], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //     },
  //     1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      
  //   }

  //   expect(getNextSectionIndex(sections, [0,0,0])).toMatchObject({next:[0,0,1],increments:[]});
  //   expect(getNextSectionIndex(sections, [0,0,1])).toMatchObject({next:[0,1],increments:[[0,0]]});
  //   expect(getNextSectionIndex(sections, [0,1])).toMatchObject({next:[0,2], increments:[]});
  //   expect(getNextSectionIndex(sections, [0,2])).toMatchObject({next:[1], increments:[[0]]});
  //   expect(getNextSectionIndex(sections, [1])).toMatchObject({next:[0,0,0], increments:[]});

  // });
  
  test("single advancement [[4,A,[2,AA,VV]],C]", () => {
    const sections: PlayerSections = {
      0: {
        0: {name: "A", index:[0,0],  next: [0,1,0], region:[0,4],  grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
        1: {
          0: {name:"AA", index: [0,1,0], next: [0,1,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          1: {name:"VV", index: [0,1,1], next: [1],   region:[16,24], grain:4, once:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
          loopCurrent: 1,
          loopLimit: 2,
          sectionCount: 2,
        },
        loopCurrent: 1,
        loopLimit: 4,
        sectionCount: 2,
      },
      1: {name: "C", index: [1], next: [0,0], region:[12,16], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }

    expect(getNextSectionIndex(sections, [0,0])).toMatchObject({next:[0,1,0],increments:[]});
    expect(getNextSectionIndex(sections, [0,1,1])).toMatchObject({next:[0,0],increments:[[0,1]]});
    
  });


  // test("double advancement [[4,A,[2,AA,VV]],C]", () => {
  //   const sections: PlayerSections = {
  //     0: {
  //       0: {name: "A", index:[0,0],  next: [0,1,0], region:[0,4],  grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
  //       1: {
  //         0: {name:"AA", index: [0,1,0], next: [0,1,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //         1: {name:"VV", index: [0,1,1], next: [1],   region:[16,24], grain:4, once:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
  //         loopCurrent: 1,
  //         loopLimit: 2,
  //         sectionCount: 2,
  //       },
  //       loopCurrent: 3,
  //       loopLimit: 4,
  //       sectionCount: 2,
  //     },
  //     1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //     loopCurrent: 0,
  //     loopLimit: Infinity,
  //     sectionCount: 2,
  //   }

  //   expect(getNextSectionIndex(sections, [0,0])).toMatchObject({next:[0,1,0],increments:[]});
  //   expect(getNextSectionIndex(sections, [0,1,1])).toMatchObject({next:[1],increments:[[0,1,1],[0,1]]});
    
  // });


  // test("Edge case multi nest single entry advancement", () => {
  //   const sections: PlayerSections = {
  //     0: {
  //       0: {
  //         0: {name:"A", index: [0,0,0], next: [0,0,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //         loopCurrent: 0,
  //         loopLimit: 2,
  //         sectionCount: 1,
  //       },
  //       loopCurrent: 0,
  //       loopLimit: 3,
  //       sectionCount: 1,
  //     },
  //     loopCurrent: 0,
  //     loopLimit: Infinity,
  //     sectionCount: 1,
  //   }
  //   // expect(getNextSectionIndex(sections, [0,0,0])).toMatchObject({next:[0,0,1],increments:[]});
  //   // expect(getNextSectionIndex(sections, [0,0,1])).toMatchObject({next:[0,1],increments:[[0,0]]});
  //   // expect(getNextSectionIndex(sections, [0,1])).toMatchObject({next:[0,2]});
  //   // expect(getNextSectionIndex(sections, [0,2])).toMatchObject({next:[1]});
  //   // expect(getNextSectionIndex(sections, [1])).toMatchObject({next:[0,0,0]});

  //   const r = getNextSectionIndex(sections, [0,0,0])
  //   console.warn(r)
  //   expect(r).toMatchObject({next:[0,0,0],increments:[[0,0]]});
    
  // });


  // test("Start - non nested start sections beginning index", ()=>{
  //   const other: PlayerSections = {
  //     0: {name:"A", index: [0], next: [1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //     1: {name: "C", index: [1], next: [0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
  //     loopCurrent: 0,
  //     loopLimit: Infinity,
  //     sectionCount: 2,
  //   }

  //   expect(findStart(other)).toStrictEqual([0]);
  // })

})



// describe("navigate section loop counter limit reached", ()=>{
  
//   test("Next from [1,1,1] -> [1,0] not [0]", () => {
//     //[A, [B,[C,D]]]
//     const sections: PlayerSections = {
//       loopCurrent: 0,
//       loopLimit: Infinity,
//       sectionCount: 2,
//       0: {name:"A", index: [0], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       1: {
//         loopCurrent: 0,
//         loopLimit: 2,
//         sectionCount: 2,
//         0: {name: "B", index: [1,0], next: [1,1,0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         1: {
//           loopCurrent: 2,
//           loopLimit: 3,
//           sectionCount: 2,
//           0: {name: "C", index: [1,1,0], next: [1,1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//           1: {name: "D", index: [1,1,1], next: [0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         },
//       },
//     }
  
//     expect(getNextSectionIndex(sections, [1,1,1])).toMatchObject({next:[1,0], increments: [[1,1]]});
//   })

//   test("Next from [0,1] -> [1,0] loop finish but shallow repeat group", () => {
//      //[[A,AA], [B,[C,D]]]
//      const sections: PlayerSections = {
//       loopCurrent: 0,
//       loopLimit: Infinity,
//       sectionCount: 2,
//       0: {
//         loopCurrent: 3,
//         loopLimit: 4,
//         sectionCount: 2,
//         0: {name:"A", index: [0,0], next: [0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         1: {name:"AA", index: [0,1], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       },
//       1: {
//         loopCurrent: 1,
//         loopLimit: 2,
//         sectionCount: 2,
//         0: {name: "B", index: [1,0], next: [1,1,0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         1: {
//           loopCurrent: 2,
//           loopLimit: 3,
//           sectionCount: 2,
//           0: {name: "C", index: [1,1,0], next: [1,1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//           1: {name: "D", index: [1,1,1], next: [0,0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         },
//       },
//     }
  
  
//     expect(getNextSectionIndex(sections, [0,1])).toMatchObject({next:[1,0], increments: [[0]]});
//   })
 
//   test("Next from [1,1,1] final loop on all", () => {
//     //[A, [B,[C,D]]]
//     const sections: PlayerSections = {
//       loopCurrent: 0,
//       loopLimit: Infinity,
//       sectionCount: 2,
//       0: {name:"A", index: [0], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       1: {
//         loopCurrent: 1,
//         loopLimit: 2,
//         sectionCount: 2,
//         0: {name: "B", index: [1,0], next: [1,1,0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         1: {
//           loopCurrent: 2,
//           loopLimit: 3,
//           sectionCount: 2,
//           0: {name: "C", index: [1,1,0], next: [1,1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//           1: {name: "D", index: [1,1,1], next: [0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         },
//       },
//     }
  
//     expect(getNextSectionIndex(sections, [1,1,1])).toMatchObject({next:[0], increments: [[1,1],[1]]});
//   })


//   test("Next from [1,1,1] back to [0,0] as all loops finish", () => {
//     //[[A,AA], [B,[C,D]]]
//     const sections: PlayerSections = {
//       loopCurrent: 0,
//       loopLimit: Infinity,
//       sectionCount: 2,
//       0: {
//         loopCurrent: 0,
//         loopLimit: 4,
//         sectionCount: 2,
//         0: {name:"A", index: [0,0], next: [0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         1: {name:"AA", index: [0,1], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       },
//       1: {
//         loopCurrent: 1,
//         loopLimit: 2,
//         sectionCount: 2,
//         0: {name: "B", index: [1,0], next: [1,1,0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         1: {
//           loopCurrent: 2,
//           loopLimit: 3,
//           sectionCount: 2,
//           0: {name: "C", index: [1,1,0], next: [1,1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//           1: {name: "D", index: [1,1,1], next: [0,0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         },
//       },
//     }
  
//     expect(getNextSectionIndex(sections, [1,1,1])).toMatchObject({next:[0,0], increments: [[1,1],[1]]});
//   })
// })


// describe("will section loop counter increase", ()=>{
//   const sections: PlayerSections = {
//     0: {name:"A", index: [0], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//     1: {
//       loopCurrent: 0,
//       loopLimit: 2,
//       sectionCount: 2,
//       0: {name: "AA", index: [1,0], next: [1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       1: {name: "BB", index: [1,1], next: [0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//     },
//     loopCurrent: 0,
//     loopLimit: Infinity,
//     sectionCount: 2,
//   }

//   test("normal advance exit repeat",()=>{
//     expect(repeatMarkerCheck(getNestedIndex(sections,[1,1]))).toMatchObject({enterLoop: false, exitLoop: true})
//   })
//   test("normal advance repeat non loop end",()=>{
//     expect(repeatMarkerCheck(getNestedIndex(sections,[1,0]))).toMatchObject({enterLoop: false, exitLoop: false})
//   })
//   test("normal advance enter repeat ",()=>{
//     expect(repeatMarkerCheck(getNestedIndex(sections,[0]))).toMatchObject({enterLoop: true, exitLoop: false})
//   })
// })

// describe("will section loop counter increase", ()=>{
//   const sections: PlayerSections = {
//     0: {name:"A", index: [0], next: [1,0,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//     1: {
//       loopCurrent: 0,
//       loopLimit: 2,
//       sectionCount: 2,
//       0: {
//         loopCurrent: 0,
//         loopLimit: 2,
//         sectionCount: 2,
//         0: {name: "AAA", index: [1,0,0], next: [1,0,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         1: {name: "BBB", index: [1,0,1], next: [1,1],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       },
//       1: {name: "AA", index: [1,1], next: [1,2], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       2: {name: "BB", index: [1,2], next: [0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//     },
//     loopCurrent: 0,
//     loopLimit: Infinity,
//     sectionCount: 2,
//   }

//   test("complex advance enter inner repeat",()=>{
//     expect(repeatMarkerCheck(getNestedIndex(sections,[1,0,1]))).toMatchObject({enterLoop: false, exitLoop: true})
//   })
//   test("complex advance enter outer repeat",()=>{
//     expect(repeatMarkerCheck(getNestedIndex(sections,[1,2]))).toMatchObject({enterLoop: false, exitLoop: true})
//   })
//   test("complex advance enter repeat",()=>{
//     expect(repeatMarkerCheck(getNestedIndex(sections,[0]))).toMatchObject({enterLoop: true, exitLoop: false})
//   })
//   test("complex advance repeat non loop end",()=>{
//     expect(repeatMarkerCheck(getNestedIndex(sections,[1,0,0]))).toMatchObject({enterLoop: false, exitLoop: false})
//   })
//   test("complex advance repeat non loop end outer",()=>{
//     expect(repeatMarkerCheck(getNestedIndex(sections,[1,1]))).toMatchObject({enterLoop: false, exitLoop: false})
//   })
// })


// describe("will section from group to group same level indentation", ()=>{
//   const sections: PlayerSections = {
//     loopCurrent: 0,
//     loopLimit: Infinity,
//     sectionCount: 2,
//     0: {
//       loopCurrent: 0,
//       loopLimit: 4,
//       sectionCount: 2,
//       0: {name:"A", index: [0,0], next: [0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       1: {name:"AA", index: [0,1], next: [1,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//     },
//     1: {
//       loopCurrent: 1,
//       loopLimit: 2,
//       sectionCount: 2,
//       0: {name: "B", index: [1,0], next: [1,1,0], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       1: {
//         loopCurrent: 2,
//         loopLimit: 3,
//         sectionCount: 2,
//         0: {name: "C", index: [1,1,0], next: [1,1,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//         1: {name: "D", index: [1,1,1], next: [0,0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
//       },
//     },
//   }
//   test("complex advance enter inner repeat",()=>{
//     expect(repeatMarkerCheck(getNestedIndex(sections,[0,1]))).toMatchObject({enterLoop: true, exitLoop: true})
//   })
// })
