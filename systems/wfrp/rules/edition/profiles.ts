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
    /** `knockdown`: any hit to 0 Wounds drops and crits; `critical`: only damage beyond 0 gives a Critical Wound (+10 per excess Wound), crits beyond TB threaten death (p171-172) */
    woundModel: 'knockdown' | 'critical';
    /** `percent`: condition levels shift the test target by 10%; `sl`: the worst penalising level costs that many SL, Stunned halves Move, Prone/Blinded/Surprised give melee attackers Advantage or SL (p184-187) */
    conditionModel: 'percent' | 'sl';
    /** `broken`: a failed Fear test costs a Broken level; `extended`: Fear is an Extended Cool test (SL accumulates to the rating, meanwhile no Momentum and the source attacks with Advantage), Terror breaks by rating (p183-184) */
    psychologyModel: 'broken' | 'extended';
    /** `legacy`: one endeavour per hero, Challenging tests, income by SL, rest wound recovery by days; `canon5e`: up to 3 endeavours, Income at Average (+2 SL) paid in dice by Status and halved on failure, Heal = IB + SL, a downtime period restores all Wounds (p170, p190, p196, p199) */
    downtimeModel: 'legacy' | 'canon5e';
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
        woundModel: 'knockdown',
        conditionModel: 'percent',
        psychologyModel: 'broken',
        downtimeModel: 'legacy',
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
        woundModel: 'critical',
        conditionModel: 'sl',
        psychologyModel: 'extended',
        downtimeModel: 'canon5e',
    },
};
