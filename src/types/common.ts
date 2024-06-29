// Helper types

/**
 * This type is for an array of values that describes the flow of music
 * @number is for a loop limit of inner arrays
 * @string is the textual name of the section to play
 * @FlowValue the array can contain sub arrays to have nested loops and music repeats
 */
export  type FlowValue = (number | string | FlowValue[]);

/**
 * This type is for referring to a FlowValue nested index.
 * See `MANIFEST.md`
 */
export  type NestedIndex = (number | string)[]

/**
 * This is what a field can contain in a nested object
 */
export  type NestedValue = number | string | any;

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
    [key: number | string]: NestedType | NestedValue;
}



export  type URLString = string
export  type DataURIString = `data${string}`