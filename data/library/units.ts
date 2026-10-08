import { DARK_ELF_UNITS } from "./units/dark-elves";
import { DEMON_UNITS } from "./units/demons";
import { DWARF_UNITS } from "./units/dwarves";
import { ELF_UNITS } from "./units/elves";
import { HUMAN_UNITS } from "./units/humans";
import { MAGE_UNITS } from "./units/mages";
import { NECROMANCER_UNITS } from "./units/necromancers";
import { NEUTRAL_UNITS } from "./units/neutrals";
import type { LibraryUnit } from "./types";

export const UNITS: LibraryUnit[] = [...HUMAN_UNITS, ...DARK_ELF_UNITS, ...MAGE_UNITS, ...DEMON_UNITS, ...ELF_UNITS, ...DWARF_UNITS, ...NECROMANCER_UNITS, ...NEUTRAL_UNITS];
