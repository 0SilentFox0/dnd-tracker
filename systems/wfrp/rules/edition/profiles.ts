export const EDITION_PRESETS = ['legacy', 'canon5e'] as const;

export type EditionPreset = (typeof EDITION_PRESETS)[number];

export interface EditionProfile {
    /** Characteristic points per advance purchase */
    advanceStep: number;
    /** Initiative is always rolled; otherwise the campaign's initiative mode decides */
    initiativeRolled: boolean;
    /** `full` = the I characteristic + d10, `bonus` = tens of I + d10 */
    initiativeBase: 'full' | 'bonus';
    /** `side`: one scene token per side, worth +1 SL; `participant`: each fighter has or lacks Momentum, it grants Advantage on melee tests */
    momentumModel: 'side' | 'participant';
    /** `slBonus`: Momentum and Fortune add +1 SL; `reverse`: they grant Advantage (digit reversal, p130) */
    advantageModel: 'slBonus' | 'reverse';
    /** `single`: Fortune refills to the Fate characteristic; `split`: Fortune has its own maximum and Fate is a separate pool */
    fortunePools: 'single' | 'split';
    xpTables: 'legacy' | 'canon5e';
    creationMode: 'legacy' | 'canon5e';
    /** `clamped`: SL is cut to the sign of the pass/fail; `final`: tens difference plus modifiers decides */
    slModel: 'clamped' | 'final';
    /** `attackerMustSucceed`: the attacker needs a passed test; `higherSl`: the higher SL wins, a tie goes to the attacker */
    opposedModel: 'attackerMustSucceed' | 'higherSl';
    /** Attack and parry targets: the bare characteristic or the weapon-group skill */
    attackTarget: 'characteristic' | 'skill';
}

export const EDITION_PROFILES: Record<EditionPreset, EditionProfile> = {
    legacy: {
        advanceStep: 1,
        initiativeRolled: false,
        initiativeBase: 'full',
        momentumModel: 'side',
        advantageModel: 'slBonus',
        fortunePools: 'single',
        xpTables: 'legacy',
        creationMode: 'legacy',
        slModel: 'clamped',
        opposedModel: 'attackerMustSucceed',
        attackTarget: 'characteristic',
    },
    canon5e: {
        advanceStep: 5,
        initiativeRolled: true,
        initiativeBase: 'bonus',
        momentumModel: 'participant',
        advantageModel: 'reverse',
        fortunePools: 'split',
        xpTables: 'canon5e',
        creationMode: 'canon5e',
        slModel: 'final',
        opposedModel: 'higherSl',
        attackTarget: 'skill',
    },
};
