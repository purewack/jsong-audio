function setNestedIndex(toSet, flows, targetIndex) {
    function deep(_flows, depth, _indexCounter) {
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
  
  function getNestedIndex(flows, targetIndex) {
    function deep(_flows, depth, _indexCounter) {
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
  
  module.exports = { setNestedIndex, getNestedIndex };
  