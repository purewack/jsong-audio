export default function buildSection(flowMap: FlowValue[]) : SectionType {
  const buildFlowSection = (count: number = 0, loopLimit: number = Infinity): SectionData => {
    return {
      count,
      loop: 0,
      loopLimit
    };
  };

  const build = (sections: FlowValue[], depth:number = 0) : SectionType | SectionData =>{
    const currentFlow: FlowValue = sections[0];
    const hasLimit = typeof currentFlow === "number" && depth != 0;
    const count = hasLimit ? sections.length - 1 : sections.length;
    const _flows = buildFlowSection(count, hasLimit ? currentFlow : undefined);
  
    for (let i = 0; i < sections.length; i++) {
      const entry = sections[i];
      if (Array.isArray(entry)) {
        _flows[i] = build(entry, depth + 1);
      } else if (typeof entry !== "number") {
        _flows[hasLimit ? i - 1 : i] = entry;
      }
    }
    if (depth) return _flows;
    return { ..._flows, index: [0] };
  }
  return build(flowMap,0) as SectionType
}