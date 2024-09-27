// Helper types

/**
 * This type is for referring to a FlowValue nested index.
 * See `MANIFEST.md`
 */
export  type NestedIndex = (number | string)[]

/**
 * This is a type for objects that have a nested signature.
 * 
 * @example
 * {
 *  0: "intro",
 *  1: {
 *      0: "sub1",
 *      1: {something: "else"}
 *  }
 * } as NestedType
 * 
 * See MANIFEST.md
 */
export  type NestedType = {
    [key: number | string]: NestedType | number | string | object;
}


export  type URLString = string
export  type DataURIString = `data${string}`