import { conditionLevel } from '../../conditions/levels';
import type { AttackModSource } from './types';

import { CombatStatus } from '@/lib/constants/battle';
import type { BattleParticipant } from '@/types/battle';

/** Asleep or unconscious: melee and Point Blank attacks hit automatically (p166) */
export const isHelpless = (p: BattleParticipant): boolean =>
    p.combatStats.status === CombatStatus.UNCONSCIOUS ||
    conditionLevel(p, 'unconscious') > 0;

// The auto-hit replaces the test, see `resolveHelpless`; no SL source here
export const helplessMods: AttackModSource = () => [];

/** Rule `edition.helplessKills`: a hit on a helpless target kills it (p166 optional) */
export const helplessKillsOf = (rules?: object | null): boolean =>
    (rules as { edition?: { helplessKills?: unknown } } | null)?.edition
        ?.helplessKills === true;
