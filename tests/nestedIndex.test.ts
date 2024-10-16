import { setNestedIndex, getNestedIndex } from "../src/util/nestedIndex";

  const nest = {
    0: {
      0: "a",
      1: "b",
      2: {
        0: "yoyo",
        hello: "world",
      },
      3: {
        0: "next",
        1: "is",
        2: "object",
        3: {section:"helloobject", autoNext: true}
      }
    },
    1: "hi",
  };

  test("get top level index", () => {
    expect(getNestedIndex(nest, [1])).toEqual("hi");
  });
  test("get second level index", () => {
    expect(getNestedIndex(nest, [0, 0])).toEqual("a");
    expect(getNestedIndex(nest, [0, 1])).toEqual("b");
  });
  test("get deep level index", () => {
    expect(getNestedIndex(nest, [0, 2, 0])).toEqual("yoyo");
    expect(getNestedIndex(nest, [0, 2, "hello"])).toEqual("world");
  });
  test("get unexpected index", () => {
    expect(getNestedIndex(nest, [0, 100])).toBeUndefined();
    expect(getNestedIndex(nest, [1, 2, 3, 4])).toBeUndefined();
    expect(getNestedIndex(nest, [])).toBeUndefined();
  });

  test("set top level index", () => {
    setNestedIndex("hey", nest, [1]);
    expect(getNestedIndex(nest, [1])).toEqual("hey");
  });
  test("set second level index", () => {
    setNestedIndex("heyA", nest, [0, 0]);
    expect(getNestedIndex(nest, [0, 0])).toEqual("heyA");
    setNestedIndex("heyB", nest, [0, 1]);
    expect(getNestedIndex(nest, [0, 1])).toEqual("heyB");
  });
  test("set deep level index", () => {
    setNestedIndex("deep", nest, [0, 2, 0]);
    expect(getNestedIndex(nest, [0, 2, 0])).toEqual("deep");
    setNestedIndex("deepWorld", nest, [0, 2, "hello"]);
    expect(getNestedIndex(nest, [0, 2, "hello"])).toEqual("deepWorld");
  });

  test("get object item", ()=>{
    expect(getNestedIndex(nest, [0,3,3])).toMatchObject({section:"helloobject", autoNext: true})
  })

