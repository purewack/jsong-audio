import { applyFlowOverrides } from '../src/overrides' // Adjust import paths as needed
import { FlowValue } from '../src/types/common';
import { PlayerFlowValue } from '../src/types/player';

describe('applyFlowOverrides', () => {
  it('should correctly parse a flow array with string instructions', () => {
    const flow: FlowValue = ["intro-x->", "chorus", "verse1-x", [2, ["bridge-X->", "verse2-x"], "verse1"]];
    
    const expectedParsedFlow: PlayerFlowValue = [
      { name: "intro", flags: { fade: true, next: true } },
      { name: "chorus" },
      { name: "verse1", flags: { fade: true, next: false } },
      [
        2,
        [
          { name: "bridge", flags: { fade: true, next: true } },
          { name: "verse2", flags: { fade: true, next: false } }
        ],
        { name: "verse1" }
      ]
    ];

    const result = applyFlowOverrides(flow);
    
    // Test that the result matches the expected parsed flow
    expect(result).toEqual(expectedParsedFlow);
  });

  it('should handle an array with only numbers', () => {
    const flow: FlowValue = [1, 2, 3, [4, 5]];

    const expectedParsedFlow: PlayerFlowValue = [1, 2, 3, [4, 5]];

    const result = applyFlowOverrides(flow);

    // Test that the result matches the original flow since there are no strings
    expect(result).toEqual(expectedParsedFlow);
  });

  it('should handle an empty array', () => {
    const flow: FlowValue = [];

    const expectedParsedFlow: PlayerFlowValue = [];

    const result = applyFlowOverrides(flow);

    // Test that the result matches the original empty array
    expect(result).toEqual(expectedParsedFlow);
  });

  it('should handle a nested array with both numbers and strings', () => {
    const flow: FlowValue = [1, "intro-x->", [2, "chorus->"], "verse1"];

    const expectedParsedFlow: PlayerFlowValue = [
      1,
      { name: "intro", flags: { fade: true, next: true } },
      [2, { name: "chorus", flags: { fade:false, next: true } }],
      { name: "verse1" }
    ];

    const result = applyFlowOverrides(flow);

    // Test that the result matches the expected parsed flow
    expect(result).toEqual(expectedParsedFlow);
  });
});
