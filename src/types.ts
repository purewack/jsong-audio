export type FlowValue = (number | string | FlowValue[]);

export type NestedIndex = (number | string)[]

export type NestedType = number | string | {
    [key: number] : NestedType | any;
}

export interface SectionData {
    [key: number] : SectionData | NestedType | any | undefined;
    loop: number;
    loopLimit: number;
    count: number;
}
export type SectionType = SectionData & {
    index?: number[];
}
