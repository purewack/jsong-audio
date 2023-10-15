function buildSection(sections, depth = 0) {
    const hasLimit = typeof sections[0] === "number";
    const count = hasLimit ? sections.length - 1 : sections.length;
    const buildFlowSection = (count = 0, loopLimit = Infinity) => {
      return {
        count,
        loop: 0,
        loopLimit: loopLimit ? loopLimit : Infinity,
      };
    };
    const flows = buildFlowSection(count, hasLimit && sections[0]);
  
    for (let i = 0; i < sections.length; i++) {
      const entry = sections[i];
      if (entry instanceof Array) {
        flows[i] = buildSection(entry, depth + 1);
      } else if (typeof entry !== "number") {
        flows[hasLimit ? i - 1 : i] = entry;
      }
    }
    if (depth) return flows;
    return { ...flows, index: [0] };
  }
  
  module.exports = { buildSection };
  