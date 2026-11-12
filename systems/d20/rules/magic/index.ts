import { D20_SPELL_RESOURCE } from "./resource";
import { d20SpellSaveDc } from "./save-dc";

import { upcastSteps } from "@/lib/utils/battle/spell/caster-dice";
import type { RuleSystemMagic } from "@/lib/utils/rules/systems/types";
import { D20_SUSTAIN } from "@/systems/d20/rules/concentration/sustain";

export const D20_MAGIC: RuleSystemMagic = { resource: D20_SPELL_RESOURCE, sustain: D20_SUSTAIN, saveDc: d20SpellSaveDc, upcast: { steps: upcastSteps } };
