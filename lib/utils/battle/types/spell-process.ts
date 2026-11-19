import type { SummonRequest } from '@/lib/utils/abilities/engine/core/types';
import type { CritPicker } from '@/lib/utils/battle/crit-choice/types';
import type { SpellFx } from '@/lib/utils/battle/fx/spells';
import type { TransformRequest } from '@/lib/utils/battle/transform/types';
import type { Ruleset } from '@/lib/utils/rules';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { SpellIngredient } from '@/lib/utils/spells/ingredients/types';
import type { SpellDice } from '@/lib/utils/spells/model/dice';
import type { SpellDefinition } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant, SpellGrant } from '@/types/battle';
import type { BattleAction } from '@/types/battle-actions';
import type { BattleMapConfig, GridPoint, TerrainDamage } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export interface CastableSpell {
    id: string;
    name: string;
    level: number;
    groupId: string | null;
    icon?: string | null;
    fx?: SpellFx | null;
    definition: SpellDefinition;
    ingredients?: SpellIngredient[];
}

export interface CastSpellParams {
    caster: BattleParticipant;
    spell: CastableSpell;
    targetIds: string[];
    allParticipants: BattleParticipant[];
    currentRound: number;
    battleId: string;
    diceRolls: number[];
    saveRolls?: Array<{ participantId: string; roll: number }>;
    attackRolls?: Array<{ participantId: string; roll: number }>;
    dice?: SpellDice;
    isDMCast?: boolean;
    isLegendaryCast?: boolean;
    slotKey?: string;
    castLevel?: number;
    optionIndex?: number;
    pickedId?: string;
    pickedSpell?: { id: string; name: string; level: number };
    grant?: SpellGrant;
    rng?: () => number;
    crit?: CritPicker;
    map?: BattleMapConfig | null;
    aim?: GridPoint;
    rules: Ruleset;
    /** an ingredient was spent on this cast (optional-ingredient systems) */
    ingredientUsed?: boolean;
    castTest?: { roll?: number; serverRoll?: true; system?: SystemSlot };
    dryRun?: boolean;
}

export interface CastSpellResult {
    success: boolean;
    casterUpdated: BattleParticipant;
    allParticipantsUpdated: BattleParticipant[];
    battleAction: BattleAction;
    summons: SummonRequest[];
    transforms?: TransformRequest[];
    messages: LogLine[];
    reason?: 'systemMismatch';
    fizzled?: boolean;
    details?: SystemSlot;
    spellDamage?: TerrainDamage;
    spellDice?: string;
    concentration?: { casterId: string; castId: string };
    interruptedIds?: string[];
}
