export type SweepMode =
    | 'sweep'
    | 'targeted'
    | 'control'
    | 'level5'
    | 'aura'
    | 'reserve'
    | 'map'
    | 'maze'
    | 'system';

export interface SweepProfile {
    key: string;
    judge: 'client' | 'server';
    /** `campaign`: existing campaign with heroes; `template`: template campaign, heroes seeded from its content and removed afterwards */
    source:
        | { kind: 'campaign'; name: string }
        | { kind: 'template'; importIfMissing: boolean };
    modes: readonly SweepMode[];
    maxBattles: number;
    unitsPerBattle: number;
    heroCount: number;
    heroLevel: number;
    /** template campaign to open when it differs from `key` */
    template?: string;
    /** campaign rules written for the duration of the run (merged over the stored JSON) and restored byte for byte afterwards */
    rules?: { modules: readonly string[]; patch: Record<string, unknown> };
    /** morale column of the seeded heroes: odd ones get it negated, so both an extra turn and a skip occur */
    heroMorale?: number;
}
