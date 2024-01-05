// Helper types
export  type FlowValue = (number | string | FlowValue[]);

export  type NestedIndex = (number | string)[]

export  type NestedValue = number | string | any;
export  interface NestedType {
    [key: number | string]: NestedType | NestedValue;
}

export  type SectionData = {
    [key: number] : SectionData | NestedType | any | undefined;
    loop: number;
    loopLimit: number;
    count: number;
}
export  type SectionType = {
    [key: number] : SectionType | SectionData | NestedType | any | undefined;
    loop: number;
    loopLimit: number;
    count: number;
    index: number[];
}

export  type URLString = string
export  type DataURIString = `data${string}`