import type { Characteristics } from "./characteristics/keys";

import { compactResources } from "@/lib/utils/characters/resources/hp";
import type { CharacterResources } from "@/types/characters";

export const onSession = (r: CharacterResources, c: Characteristics): CharacterResources => compactResources({ ...r, fortune: c.fate });
