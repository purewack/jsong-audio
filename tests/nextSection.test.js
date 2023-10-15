const { nextSection } = require("../nextSection");
const { buildSection } = require("../buildSection");

const flow = ["intro", [[2, "chorus", "verse"], "bass"]];
const sections = buildSection(flow);

test("Build sections from flow", () => {
  expect(sections).toMatchObject({
    0: "intro",
    1: {
      0: {
        0: "chorus",
        1: "verse",
        loop: 0,
        loopLimit: 2,
        count: 2,
      },
      1: "bass",
      loop: 0,
      loopLimit: Infinity,
      count: 2,
    },
    loop: 0,
    loopLimit: Infinity,
    count: 2,
  });
});

describe("Next Section Navigation", () => {
  test("Next - nest 2 levels", () => {
    nextSection(sections);
    expect(sections.index).toStrictEqual([1, 0, 0]);
  });
  test("Next - nest 2 levels, single advance", () => {
    nextSection(sections);
    expect(sections.index).toStrictEqual([1, 0, 1]);
  });
  test("Next - loop over 2nd level", () => {
    nextSection(sections);
    expect(sections.index).toStrictEqual([1, 0, 0]);
  });
  test("Next - nest 2 levels, single advance after loop", () => {
    nextSection(sections);
    expect(sections.index).toStrictEqual([1, 0, 1]);
  });

  test("Next - loop break 2nd to 1st level", () => {
    nextSection(sections);
    expect(sections.index).toStrictEqual([1, 1]);
  });
  test("Next - loop back to beginning", () => {
    nextSection(sections, true);
    expect(sections.index).toStrictEqual([0]);
  });
});
