const { getLoopCount } = require("./getLoopCount");
const { buildSection } = require("./buildSection");
const { setNestedIndex } = require("./nestedIndex");

const flow = ["intro", [[2, "chorus", "verse"], "bass"]];
const sections = buildSection(flow);
setNestedIndex(1,sections,['loop'])
setNestedIndex(2,sections,[1,'loop'])
setNestedIndex(3,sections,[1,0,'loop'])

test("Build sections from flow", () => {
  expect(sections).toMatchObject({
    0: "intro",
    1: {
      0: {
        0: "chorus",
        1: "verse",
        loop: 3,
        loopLimit: 2,
        count: 2,
      },
      1: "bass",
      loop: 2,
      loopLimit: Infinity,
      count: 2,
    },
    loop: 1,
    loopLimit: Infinity,
    count: 2,
  });
});

describe("Get loop count", () => {
  test("top level", () => {
    expect(getLoopCount(sections,[0])).toBe(1);
  });

  test("2nd level", () => {
    expect(getLoopCount(sections,[1,0])).toBe(2);
    expect(getLoopCount(sections,[1,1])).toBe(2);
  });
  
  test("3rd level", () => {
    expect(getLoopCount(sections,[1,0,0])).toBe(3);
    expect(getLoopCount(sections,[1,0,1])).toBe(3);
  });
});