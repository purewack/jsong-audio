import { NestedIndex, NestedType } from "./types";

export function setNestedIndex(
  toSet: NestedType, 
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
      _flows[levelIndex] = toSet;
    } else {
      deep(_flows[levelIndex], depth + 1, _indexCounter);
    }
  }
  deep(flows, 0, [...Array(targetIndex.length)]);
}
  
export function getNestedIndex(
  flows: NestedType, 
  targetIndex: NestedIndex
):
(undefined | any) {
  function deep(_flows: NestedType, depth: number, _indexCounter: NestedIndex)
  : (NestedType | undefined) {
    const levelIndex = targetIndex[depth];
    _indexCounter[depth] = levelIndex;
    // console.log({ levelIndex, _indexCounter, targetIndex, depth });
    // console.log(_indexCounter + "", targetIndex + "");
    if (_indexCounter + "" === targetIndex + "") {
      // console.log("get", targetIndex);
      return _flows[levelIndex];
    } else if (_flows[levelIndex]) {
      return deep(_flows[levelIndex], depth + 1, _indexCounter);
    } else return undefined;
  }
  return deep(flows, 0, [...Array(targetIndex.length)]);
} 