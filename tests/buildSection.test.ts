import buildSection from "../src/buildSection";

test("Build sections from flow with section options", () => {
  const flow = ["intro", [[2, 'A', "verse"], "bass"]];
  const sections = buildSection(flow);

  expect(sections).toMatchObject({
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
    0: {name:"intro", index: [0], next: [1,0,0]},
    1: {
      0: {
        0: {name:"A", index: [1,0,0], next: [1,0,1]},
        1: {name:"verse", index: [1,0,1], next: [1,1]},
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
      },
      1: {name: "bass", index: [1,1], next: [0]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 2,
    }
  });
});

test("Build sections with overrides", () => {
  const flow = ["intro->", [[2, 'A', "verse"], "A-x->", "bass"]];
  const sections = buildSection(flow);
 
  expect(sections).toMatchObject({
    loopCurrent: 0,
    loopLimit: Infinity,
    sectionCount: 2,
    0: {name:"intro", index: [0], next: [1,0,0], overrides: {fade: false, next: true}},
    1: {
      0: {
        0: {name:"A", index: [1,0,0], next: [1,0,1]},
        1: {name:"verse", index: [1,0,1], next: [1,1]},
        loopCurrent: 0,
        loopLimit: 2,
        sectionCount: 2,
      },
      1: {name: "A", index:[1,1], next: [1,2], overrides: {fade: true, next: true}},
      2: {name: "bass", index: [1,2], next: [0]},
      loopCurrent: 0,
      loopLimit: Infinity,
      sectionCount: 3,
    },
  });
});


test("Build sections with overrides and deep start", () => {
  const flow = [[[2, 'A', "V"], "A-x->", "B"], "C"];
  const sections = buildSection(flow);
 
  expect(sections).toMatchObject(
    {
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
    }
  );
});