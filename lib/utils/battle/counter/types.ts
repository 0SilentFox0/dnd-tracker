import type { SpellRequestData } from '@/lib/schemas/battles';

export interface CounterOffer {
    reactorId: string;
    spellId: string;
    grantKey?: string;
    slotLevels: number[];
    dm: boolean;
    answer?: 'pass' | 'failed';
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
}

export interface InterruptSpell {
    id: string;
    name: string;
    level: number;
    range: number;
}
