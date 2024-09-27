import buildSection from "../src/buildSection";

const defGrain = 4;

test("Build sections from flow with section options", () => {
  const map = {
    "intro": { "region": [0, 4] as [number,number], "grain": 16 },
    "A": { "region": [4, 12] as [number,number], "grain": 8 },
    "verse": { "region": [12, 16] as  [number,number]},
    "bass": { "region": [16, 24] as  [number,number], "legato": {"xfades": ["guitar", "lead"]}},
  }
  const flow = ["intro", [[2, 'A', "verse"], "bass"]];
  const sections = buildSection(flow,map,defGrain);

  expect(sections).toMatchObject({
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
    0: {name:"intro", index: [0], next: [1,0,0], region: [0, 4], grain: 16},
    1: {
      0: {
        0: {name:"A", index: [1,0,0], next: [1,0,1], region: [4, 12], grain: 8 },
        1: {name:"verse", index: [1,0,1], next: [1,1], region: [12,16], grain:4},
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
      },
      1: {name: "bass", index: [1,1], next: [0], region: [16,24], grain:4},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }
  });
});

test("Build sections with overrides", () => {  
  const map = {
    "intro": { "region": [0, 4] as [number,number], "grain": 16 },
    "A": { "region": [4, 12] as [number,number], "grain": 8 },
    "verse": { "region": [12, 16] as  [number,number]},
    "bass": { "region": [16, 24] as  [number,number], "legato": {"xfades": ["guitar", "lead"]}},
  }
  const flow = ["intro->", [[2, 'A', "verse"], "A-x->", "bass"]];
  const sections = buildSection(flow,map,defGrain);
 
  expect(sections).toMatchObject({
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
    0: {name:"intro", index: [0], next: [1,0,0], region:[0,4], grain:16 ,overrides: {fade: false, next: true}},
    1: {
      0: {
        0: {name:"A", index: [1,0,0], next: [1,0,1],  region:[4,12], grain:8 },
        1: {name:"verse", index: [1,0,1], next: [1,1], region:[12,16], grain:4},
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
      },
      1: {name: "A", index:[1,1], next: [1,2],   region:[4,12], grain:8, overrides: {fade: true, next: true}},
      2: {name: "bass", index: [1,2], next: [0],  region:[16,24], grain:4},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 3,
    },
  });
});


test("Build sections with overrides and deep start", () => {
  const map = {
    "A": { "region": [0, 4] as [number,number], "grain": 16 },
    "B": { "region": [4, 12] as [number,number], "grain": 8 },
    "C": { "region": [12, 16] as  [number,number]},
    "V": { "region": [16, 24] as  [number,number], "legato": {"xfades": ["A", "B"]}},
  }
  const flow = [[[2, 'A', "V"], "A-x->", "B"], "C"];
  const sections = buildSection(flow,map,defGrain);
 
  expect(sections).toMatchObject(
    {
      0: {
        0: {
          0: {name:"A", index: [0,0,0], next: [0,0,1], region:[0,4], grain:16},
          1: {name:"V", index: [0,0,1], next: [0,1], region:[16,24], grain:4, legato: {xfades: ["A", "B"]}},
          loopCurrent: 0,
          loopLimit: 2,
          sectionCount: 2,
        },
        1: {name: "A", index:[0,1], next: [0,2], region:[0,4], grain:16, overrides: {fade: true, next: true}},
        2: {name: "B", index: [0,2], next: [1], region:[4,12], grain:8},
        loopCurrent: 0,
        loopLimit: Infinity,
        sectionCount: 3,
      },
      1: {name: "C", index: [1], next: [0,0,0], region:[12,16], grain:4},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }
  );
});