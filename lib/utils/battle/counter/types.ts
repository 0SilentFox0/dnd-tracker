import type { AppMessageKey } from '@/lib/i18n/text-ref';
import type { SpellRequestData } from '@/lib/schemas/battles';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';

export interface CounterOffer {
    reactorId: string;
    spellId?: string;
    grantKey?: string;
    slotLevels: number[];
    dm: boolean;
    answer?: 'pass' | 'failed';
    /** Answered by the rule system's cast reaction instead of a counter spell */
    system?: { label: AppMessageKey };
}

export interface ShownCounter {
    kind: 'counter';
    windowId: string;
    actorId: string;
    spell?: { name: string; level: number };
    deadline: string;
    offers: CounterOffer[];
    dmDeciding?: boolean;
}

export interface HiddenCounter {
    request: SpellRequestData;
    seed: number;
    serverRolls?: boolean;
    userId: string;
    isDM: boolean;
    attempts: number;
    /** The system's view of the held cast, given back to its reaction; never sent to clients */
    system?: SystemSlot;
}

export interface InterruptSpell {
    id: string;
    name: string;
    level: number;
    range: number;
}
