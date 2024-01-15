import { BarsBeatsSixteenths } from "tone/build/esm/core/type/Units";
import { NestedIndex } from "./common";
import { JSONgPlaybackMapType } from "./jsong";
import { PlayerSectionOverrideFlags } from "./player";

export type SectionEventDetail = JSONgPlaybackMapType & {
    index: NestedIndex,
    name: string,
    overrides: PlayerSectionOverrideFlags[]
};
export type SectionEventDetailNext = SectionEventDetail & {when: BarsBeatsSixteenths}