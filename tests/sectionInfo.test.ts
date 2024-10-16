import {getIndexInfo, setIndexInfo} from "../src/sectionsNavigation";
import { PlayerSectionGroup } from "../src/types/player";


describe("get nested sections info",()=>{
  const sections: PlayerSectionGroup = {
      0: {name:"A", index: [0], next: [1,0,0], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
      1: {
          loopCurrent: 100,
          loopLimit: 2,
          sectionCount: 2,
          0: {
              loopCurrent: 0,
              loopLimit: 20,
              sectionCount: 2,
              0: {name: "AAA", index: [1,0,0], next: [1,0,1], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
              1: {name: "BBB", index: [1,0,1], next: [1,1],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
          },
          1: {name: "AA", index: [1,1], next: [1,2], region:[4,8], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
          2: {name: "BB", index: [1,2], next: [0],   region:[8,10], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0}]},
      },
      loopCurrent: 1,
      loopLimit: Infinity,
      sectionCount: 2,
  }

  // test("address using specific section index",()=>{
  //     expect(getIndexInfo(sections,[1,1]).loopCurrent).toBe(100)
  //     expect(getIndexInfo(sections,[1,0,0]).loopLimit).toBe(20)
  //     expect(getIndexInfo(sections,[0]).loopCurrent).toBe(1)
  // })


  test("address with group index",()=>{
    expect(getIndexInfo(sections,[1]).loopCurrent).toBe(100)
    expect(getIndexInfo(sections,[]).loopLimit).toBe(Infinity)
})
})

describe("get nested sections info",()=>{
    const sections: PlayerSectionGroup = {
        0: {
          0: {
            0: {name:"A", index: [0,0,0], next: [0,0,1], region:[0,4],   grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
            1: {name:"V", index: [0,0,1], next: [0,1],   region:[16,24], grain:4, once:false, transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"sync",duration:0}]},
            loopCurrent: 1,
            loopLimit: 50,
            sectionCount: 2,
          },
          1: {name: "A", index:[0,1],  next: [0,2], region:[0,4],  grain:4, once:true,  transition: [{name:"trackA",type:"fade",duration:4},{name:"trackB",type:"fade",duration:4}]},
          2: {name: "B", index: [0,2], next: [1],   region:[4,12], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
          loopCurrent: 0,
          loopLimit: 20,
          sectionCount: 3,
        },
        1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4, once:false, transition: [{name:"trackA",type:"sync",duration:0},{name:"trackB",type:"sync",duration:0}]},
        loopCurrent: 0,
        loopLimit: Infinity,
        sectionCount: 2,
    }
  
    test("get section level for malformed index [0,0]",()=>{
        expect(getIndexInfo(sections,[0,0]).loopLimit).toBe(50)
    })
    test("get section level for malformed index",()=>{
        expect(getIndexInfo(sections,[0]).loopLimit).toBe(20)
    })
  })
  

// describe("set info",()=>{
// let sections = {
//   0: {name:"intro", index: [0], next: [1,0,0], region:[0,4], grain:4},
//   1: {
//     0: {
//       0: {name:"chorus", index: [1,0,0], next: [1,0,1], region:[4,8], grain:16},
//       1: {name:"verse",  index: [1,0,1], next: [1,1], region:[8,12], grain:4},
//       loopCurrent: 0,
//       loopLimit: 2,
//       sectionCount: 2,
//     },
//     1: {name:"bass", index: [1,1], next:[0], region:[12,16], grain:4},
//     loopCurrent: 0,
//     loopLimit: Infinity,
//     sectionCount: 2,
//   },
//   loopCurrent: 0,
//   loopLimit: Infinity,
//   sectionCount: 2,
// }


// test("top level", () => {
//   const a = setIndexInfo({loopCurrent:1},sections,[0])!
//   expect(getIndexInfo(a,[0])).toMatchObject(
//     {
//       0: {name:"intro", index: [0]},
//       1: {
//         0: {
//           0: {name:"chorus", index: [1,0,0]},
//           1: {name:"verse",  index: [1,0,1]},
//           loopCurrent: 0,
//           loopLimit: 2,
//           sectionCount: 2,
//         },
//         1: {name:"bass", index: [1,1]},
//         loopCurrent: 0,
//         loopLimit: Infinity,
//         sectionCount: 2,
//       },
//       loopCurrent: 1,
//       loopLimit: Infinity,
//       sectionCount: 2,
//     }
//   )
// });

// test("get deep level", ()=>{
//   expect(getIndexInfo(sections,[1,0,1])).toMatchObject(
//     {
//       0: {name:"chorus", index: [1,0,0]},
//       1: {name:"verse",  index: [1,0,1]},
//       loopCurrent: 0,
//       loopLimit: 2,
//       sectionCount: 2,
//     }
//   )
// })

// test("2nd level", () => {
//   const a = setIndexInfo({loopCurrent:2},sections,[1,1])!
//   expect(a).toMatchObject(
//     {
//       0: {name:"intro", index: [0]},
//       1: {
//         0: {
//           0: {name:"chorus", index: [1,0,0]},
//           1: {name:"verse",  index: [1,0,1]},
//           loopCurrent: 0,
//           loopLimit: 2,
//           sectionCount: 2,
//         },
//         1: {name:"bass", index: [1,1]},
//         loopCurrent: 2,
//         loopLimit: Infinity,
//         sectionCount: 2,
//       },
//       loopCurrent: 0,
//       loopLimit: Infinity,
//       sectionCount: 2,
//     }
//   )
// });

// test("3rd level", () => {
//   const a = setIndexInfo({loopCurrent:6},sections,[1,0,0])!
//   expect(a).toMatchObject(
//     {
//       0: {name:"intro", index: [0]},
//       1: {
//         0: {
//           0: {name:"chorus", index: [1,0,0]},
//           1: {name:"verse",  index: [1,0,1]},
//           loopCurrent: 6,
//           loopLimit: 2,
//           sectionCount: 2,
//         },
//         1: {name:"bass", index: [1,1]},
//         loopCurrent: 0,
//         loopLimit: Infinity,
//         sectionCount: 2,
//       },
//       loopCurrent: 0,
//       loopLimit: Infinity,
//       sectionCount: 2,
//     }
//   )
// });

// })