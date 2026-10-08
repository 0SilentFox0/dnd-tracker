import { DARK_ELF_UNITS } from "./units/dark-elves";
import { HUMAN_UNITS } from "./units/humans";
import { MAGE_UNITS } from "./units/mages";
import type { LibraryUnit } from "./types";

export const UNITS: LibraryUnit[] = [...HUMAN_UNITS, ...DARK_ELF_UNITS, ...MAGE_UNITS];
