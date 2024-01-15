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
 *      1: "sub2"
 *  }
 * } as NestedType
 * 
 * See MANIFEST.md
 */
export  type NestedType = {
    [key: number | string]: NestedType | NestedValue;
}

/**
 * This is an extension of a nested type where it specifically refers to a 'built' section map.
 * This 'built' section map is composed using the Flow sections and all loop counters are resolved into real numbers.
 */
export  type SectionData = {
    [key: number] : SectionData | NestedType | any | undefined;
    loop: number;
    loopLimit: number;
    count: number;
}

/**
 * This is the root type for sections with one addition, the current index counter. This counter is vital to keep track of the sections flow.
 */
export  type SectionType = {
    [key: number] : SectionType | SectionData | NestedType | any | undefined;
    loop: number;
    loopLimit: number;
    count: number;
    index: number[];
}

export  type URLString = string
export  type DataURIString = `data${string}`