import buildSection from "../src/buildSection";
import { setNestedIndex } from "../src/nestedIndex";

const flow = ["intro", [[2, 'A', "verse"], "bass"]];
const sections = buildSection(flow);
setNestedIndex(1,sections,['loop'])
setNestedIndex(2,sections,[1,'loop'])
setNestedIndex(3,sections,[1,0,'loop'])

test("Build sections from flow with section options", () => {
  expect(sections).toMatchObject({
    0: "intro",
    1: {
      0: {
        0: "A",
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