import { NestedValue, NestedType, NestedIndex } from "./types/common";

export function setNestedIndex(
  value: NestedValue, 
  flows: NestedType, 
  targetIndex: NestedIndex
): void 
{
  function deep(_flows: NestedType, depth: number, _indexCounter: NestedIndex): void {
    const levelIndex = targetIndex[depth];
    _indexCounter[depth] = levelIndex;
    // console.log(levelIndex, _indexCounter, targetIndex);
    if (_indexCounter + "" === targetIndex + "") {
      // console.log("set", _indexCounter);
      _flows[levelIndex] = value;
    } else {
      deep(_flows[levelIndex] as NestedType, depth + 1, _indexCounter);
    }
  }
  deep(flows, 0, [...Array(targetIndex.length)]);
}
  
export function getNestedIndex(
  flows: NestedType, 
  targetIndex: NestedIndex
):
(undefined | NestedValue) {
  function deep(_flows: NestedType, depth: number, _indexCounter: NestedIndex)
  : (NestedValue | undefined) {
    const levelIndex = targetIndex[depth];
    _indexCounter[depth] = levelIndex;
    // console.log({ levelIndex, _indexCounter, targetIndex, depth });
    // console.log(_indexCounter + "", targetIndex + "");
    if (_indexCounter + "" === targetIndex + "") {
      // console.log("get", targetIndex);
      return _flows[levelIndex] as NestedValue;
    } else if (_flows[levelIndex]) {
      return deep(_flows[levelIndex] as NestedType, depth + 1, _indexCounter);
    } else return undefined;
  }
  return deep(flows, 0, [...Array(targetIndex.length)]);
} 