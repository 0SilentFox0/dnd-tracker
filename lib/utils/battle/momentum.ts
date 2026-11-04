import type { SceneMomentum } from "@/types/battle";

export const NO_MOMENTUM: SceneMomentum = {};

export const hasMomentum = (m: SceneMomentum): boolean => Object.keys(m).length > 0;
