import { bonus, skillTarget, value } from '../characteristics/derive';
import { fateSpendsOn } from '../combat/fate';
import { participantChars } from '../combat/participant';
import { selfSlMod, selfTestMod } from '../conditions/test-mod';
import { editionOf } from '../edition';
import {
    type PercentileTestResult,
    resolvePercentileTest,
} from '../percentile';
import { resolveModeSources } from '../percentile/advantage';
import {
    applyFortune,
    type CritBonus,
    forcedOf,
    FORTUNE_INPUT,
    spentFor,
} from '../percentile/fortune';
import { ACTION_SLOT } from '../slots';
import { wfrpState, withWfrpState } from '../state';
import { armourSl } from './armour';
import {
    CAST_SKILL,
    CRIT_BONUS_DEFAULT,
    MAJOR_MISCAST_ROLLS,
    MAX_OVERCAST_STEPS,
    NO_OVERCAST_KINDS,
    OVERCAST_SL_STEP,
    OVERCAST_TABLE,
    type OvercastRow,
    PRAY_SKILL,
    PRAYER_KINDS,
} from './constants';
import { prayerOvercast, prayerSteps } from './prayer-overcast';

import { textRef } from '@/lib/i18n/text-ref';
import type { Ruleset } from '@/lib/utils/rules';
import type {
    CastTestCtx,
    CastTestResult,
} from '@/lib/utils/rules/systems/types';
import type { SpellMagicKind } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';

export function castTargetOf(
    caster: BattleParticipant,
    rules?: Ruleset
): number {
    const chars = participantChars(caster);

    return (
        (skillTarget(chars, CAST_SKILL.key, CAST_SKILL.spec)?.target ??
            value(chars, 'int')) + selfTestMod(caster, 'test', editionOf(rules))
    );
}

export function prayTargetOf(
    caster: BattleParticipant,
    rules?: Ruleset
): number {
    const chars = participantChars(caster);

    return (
        (skillTarget(chars, PRAY_SKILL.key)?.target ?? value(chars, 'fel')) +
        selfTestMod(caster, 'test', editionOf(rules))
    );
}

export function overcastRowOf(budget: number): OvercastRow | undefined {
    return OVERCAST_TABLE.filter((r) => r.sl <= budget).at(-1);
}

export const isPrayerKind = (kind: SpellMagicKind | undefined): boolean =>
    kind !== undefined && PRAYER_KINDS.has(kind);

export function wfrpCastTest(ctx: CastTestCtx): CastTestResult {
    const { caster, spell, magic, rng, presetRoll } = ctx;

    const prayer = isPrayerKind(magic.kind);

    const target = prayer
        ? prayTargetOf(caster, ctx.rules)
        : castTargetOf(caster, ctx.rules);

    const channelled = prayer ? 0 : (wfrpState(caster).channelledSl ?? 0);

    const edition = editionOf(ctx.rules);

    const canon = edition.magicModel === 'canon5e';

    const armour = prayer ? 0 : armourSl(caster, edition);

    const petty = magic.kind === 'petty';

    const cn =
        magic.kind === 'blessing' || (canon && (petty || prayer))
            ? 0
            : magic.cn;

    const fortuneInput = FORTUNE_INPUT.read(ctx.system);

    const reverse = editionOf(ctx.rules).advantageModel === 'reverse';

    const edge = fortuneInput?.kind === 'sl';

    const modeOf = resolveModeSources({ advantage: edge && reverse ? 1 : 0 });

    const slModifier =
        channelled -
        armour +
        selfSlMod(caster, editionOf(ctx.rules)) +
        (edge && !reverse ? 1 : 0) +
        modeOf.slMod;

    const forcedByFate = fortuneInput?.kind === 'notFail';

    const bareOf = (t: PercentileTestResult) =>
        canon && channelled > 0 && !forcedByFate
            ? resolvePercentileTest({
                  target,
                  slModifier: slModifier - channelled,
                  mode: modeOf.mode,
                  doubles: true,
                  slModel: edition.slModel,
                  rng,
                  presetRoll: t.rawRoll,
              })
            : t;

    // Channelled SL counts towards the test, but a fumble stays a fumble (p235)
    const testPassed = (t: PercentileTestResult) =>
        bareOf(t).outcome !== 'fumble' &&
        (t.outcome === 'success' || t.outcome === 'critical');

    const passes = (t: PercentileTestResult) => testPassed(t) && t.sl >= cn;

    const { result: test, fortune } = applyFortune(
        (preset) =>
            resolvePercentileTest({
                target,
                slModifier,
                mode: modeOf.mode,
                doubles: true,
                slModel: editionOf(ctx.rules).slModel,
                rng,
                presetRoll: preset,
                forced: forcedOf(fortuneInput, cn),
            }),
        fortuneInput,
        passes,
        presetRoll,
        { repeat: fateSpendsOn(ctx.rules) }
    );

    const success = passes(test);

    const bare = bareOf(test);

    const fumbled = canon
        ? bare.outcome === 'fumble'
        : test.outcome === 'fumble';

    // Critical Casting needs a passed test only: SL below CN still fails the spell (p235)
    const critical = canon
        ? testPassed(test) && test.outcome === 'critical' && !petty
        : success && test.outcome === 'critical';

    const sin = wfrpState(caster).sin ?? 0;

    const wrath = canon
        ? fumbled || (sin > 0 && test.roll % 10 <= sin)
        : test.doubles && sin > 0 && test.roll % 10 <= sin;

    const malignant = wfrpState(caster).malignant === true;

    const canonMiscast =
        fumbled || critical ? (malignant ? 'major' : 'minor') : null;

    const legacyMiscast = MAJOR_MISCAST_ROLLS.has(test.roll)
        ? 'major'
        : test.doubles
          ? 'minor'
          : null;

    const miscast = prayer
        ? wrath
            ? 'wrath'
            : null
        : canon
          ? canonMiscast
          : legacyMiscast;

    const critBonus: CritBonus | undefined =
        canon && critical
            ? (fortuneInput?.critBonus ?? CRIT_BONUS_DEFAULT)
            : undefined;

    const overcastAllowed = canon
        ? success &&
          (prayer ||
              (magic.overcast !== null && !NO_OVERCAST_KINDS.has(magic.kind)))
        : success &&
          magic.overcast !== null &&
          !NO_OVERCAST_KINDS.has(magic.kind);

    const overcastBudget = Math.min(
        bonus(participantChars(caster), 'int') +
            bonus(participantChars(caster), 'wp'),
        Math.max(0, test.sl - cn) +
            (critBonus === 'totalPower' ? Math.floor(test.roll / 10) : 0)
    );

    const overcastSteps = !overcastAllowed
        ? 0
        : canon && prayer
          ? prayerSteps(test.sl)
          : canon
            ? (overcastRowOf(overcastBudget)?.damage ?? 0)
            : Math.min(
                  MAX_OVERCAST_STEPS,
                  Math.max(0, Math.floor((test.sl - cn) / OVERCAST_SL_STEP))
              );

    const outcome = success
        ? critical
            ? 'critical'
            : 'success'
        : fumbled
          ? 'fumble'
          : 'failure';

    const params = {
        name: caster.basicInfo.name,
        spell: spell.name,
        roll: test.roll,
        target: test.target,
        sl: test.sl,
        cn,
    };

    const lines = [
        textRef(
            critical && success
                ? 'wfrpMagic.log.castCritical'
                : success
                  ? 'wfrpMagic.log.castSuccess'
                  : 'wfrpMagic.log.castFail',
            params
        ),
    ];

    if (fortune)
        lines.push(
            textRef(
                fortune.kind === 'reroll' && fortune.spent > 1
                    ? 'battleWfrp.log.fortuneRerolls'
                    : fortune.kind === 'reroll'
                      ? 'battleWfrp.log.fortuneReroll'
                      : fortune.kind === 'notFail'
                        ? 'battleWfrp.log.fateNotFail'
                        : reverse
                          ? 'battleWfrp.log.fortuneAdvantage'
                          : 'battleWfrp.log.fortuneSl',
                {
                    name: caster.basicInfo.name,
                    first: fortune.firstRoll ?? 0,
                    rolls: fortune.spent,
                }
            )
        );

    const spendFortune = Boolean(fortune);

    const dropChannelled = channelled > 0;

    const markCast = editionOf(ctx.rules).momentumModel === 'participant';

    const remember = canon && success;

    const casterUpdate =
        spendFortune || dropChannelled || markCast || remember
            ? (p: BattleParticipant) =>
                  withWfrpState(p, {
                      ...(fortune && spentFor(p, fortune.kind, fortune.spent)),
                      ...(dropChannelled && { channelledSl: undefined }),
                      ...(markCast && { lastHand: 'cast' as const }),
                      ...(remember && {
                          lastCast: {
                              spell: spell.name,
                              sl: test.sl,
                              ...(ctx.at && { at: ctx.at }),
                              ...(ctx.targets?.length && {
                                  targets: [...ctx.targets],
                              }),
                              ...(critBonus && { critBonus }),
                          },
                      }),
                  })
            : undefined;

    return {
        success,
        margin: test.sl,
        overcastSteps,
        ...(canon && { overcastDamage: prayer ? 0 : overcastSteps }),
        miscast,
        details: ACTION_SLOT.write({
            cast: {
                roll: test.roll,
                ...(test.rawRoll !== test.roll && { rawRoll: test.rawRoll }),
                target: test.target,
                sl: test.sl,
                cn,
                channelled,
                armourSl: armour,
                doubles: test.doubles,
                outcome,
                overcastSteps,
                miscast,
                ...(critBonus && { critBonus }),
                ...(canon &&
                    prayer &&
                    overcastSteps > 0 && {
                        prayerOvercast: prayerOvercast(
                            magic.kind,
                            overcastSteps,
                            fortuneInput?.blessing
                        ),
                    }),
                ...(canon && { stepAvert: true as const }),
                ...(fortune && { fortune }),
            },
        }),
        lines,
        ...(casterUpdate && { casterUpdate }),
    };
}
