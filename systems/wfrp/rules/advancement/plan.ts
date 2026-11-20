import {
    CHARACTERISTIC_KEYS,
    type CharacteristicKey,
    type Characteristics,
    LEDGER_MAX,
    type LedgerEntry,
    SKILL_ADVANCE_KEY_RE,
} from '../characteristics/keys';
import type { DowntimeState } from '../downtime/types';
import { isAdvancedSkill } from './canon';
import { type CareerCtx, careerPrice, tickKey } from './career';
import { advanceCost, advanceTarget, talentCost } from './cost';
import type { AdvancementRules } from './rules';

export type PurchaseRequest = {
    kind: 'characteristic' | 'skill' | 'talent';
    key: string;
};

export type PurchaseError =
    | 'INSUFFICIENT_XP'
    | 'AT_LIMIT'
    | 'MAX_RANK'
    | 'UNKNOWN_KEY'
    | 'UNKNOWN_TALENT'
    | 'TALENT_NO_COST'
    | 'ADVANCE_OUT_OF_CAREER';

export type PurchaseTalent = {
    id: string;
    xpCost: number | null;
    maxRank: number | null;
};

export type PurchaseInput = {
    characteristics: Characteristics;
    available: number;
    request: PurchaseRequest;
    rules: AdvancementRules;
    /** Points per purchase (`editionOf(rules).advanceStep`); 1 = legacy */
    step?: number;
    /** Flat talent price (`xpTables: canon5e`) */
    flatTalent?: boolean;
    /** `xpTables: canon5e`: out-of-career talents and advanced skills cannot be bought (p44, p197) */
    careerOnly?: boolean;
    talent?: PurchaseTalent;
    career?: CareerCtx;
    now: string;
    id: string;
};

export type PurchaseResult =
    | { ok: true; next: Characteristics; entry: LedgerEntry }
    | { ok: false; error: PurchaseError };

const isCharacteristicKey = (key: string): key is CharacteristicKey =>
    (CHARACTERISTIC_KEYS as readonly string[]).includes(key);

type Priced =
    | {
          from: number;
          to: number;
          cost: number;
          apply: (c: Characteristics) => Characteristics;
      }
    | { error: PurchaseError };

function priceCharacteristic(
    c: Characteristics,
    key: string,
    rules: AdvancementRules,
    step: number
): Priced {
    if (!isCharacteristicKey(key)) return { error: 'UNKNOWN_KEY' };

    const from = c.advances[key];

    const cost = advanceCost('characteristic', from, rules, step);

    const to = advanceTarget(from, rules.characteristic.max, step);

    if (cost === null || to === null) return { error: 'AT_LIMIT' };

    return {
        from,
        to,
        cost,
        apply: (cur) => ({
            ...cur,
            advances: { ...cur.advances, [key]: to },
        }),
    };
}

function priceSkill(
    c: Characteristics,
    key: string,
    rules: AdvancementRules,
    step: number
): Priced {
    if (!SKILL_ADVANCE_KEY_RE.test(key)) return { error: 'UNKNOWN_KEY' };

    const from = c.skillAdvances[key] ?? 0;

    const cost = advanceCost('skill', from, rules, step);

    const to = advanceTarget(from, rules.skill.max, step);

    if (cost === null || to === null) return { error: 'AT_LIMIT' };

    return {
        from,
        to,
        cost,
        apply: (cur) => ({
            ...cur,
            skillAdvances: { ...cur.skillAdvances, [key]: to },
        }),
    };
}

function priceTalent(
    c: Characteristics,
    key: string,
    talent: PurchaseTalent | undefined,
    rules: AdvancementRules,
    flat: boolean
): Priced {
    if (!talent || talent.id !== key) return { error: 'UNKNOWN_TALENT' };

    if (talent.xpCost === null) return { error: 'TALENT_NO_COST' };

    const from = c.talents[key] ?? 0;

    if (from >= (talent.maxRank ?? 1)) return { error: 'MAX_RANK' };

    return {
        from,
        to: from + 1,
        cost: talentCost(talent.xpCost, from, rules, flat),
        apply: (cur) => ({
            ...cur,
            talents: { ...cur.talents, [key]: from + 1 },
        }),
    };
}

const withoutTraining = ({
    training: _training,
    ...rest
}: DowntimeState): DowntimeState => rest;

export function planPurchase(input: PurchaseInput): PurchaseResult {
    const { characteristics, request, rules } = input;

    const step = input.step ?? 1;

    const priced =
        request.kind === 'characteristic'
            ? priceCharacteristic(characteristics, request.key, rules, step)
            : request.kind === 'skill'
              ? priceSkill(characteristics, request.key, rules, step)
              : priceTalent(
                    characteristics,
                    request.key,
                    input.talent,
                    rules,
                    input.flatTalent === true
                );

    if ('error' in priced) return { ok: false, error: priced.error };

    const { cost, outOfCareer } = careerPrice(
        input.career,
        rules,
        request.kind,
        request.key,
        priced.cost
    );

    if (
        input.careerOnly &&
        outOfCareer !== null &&
        (request.kind === 'talent' ||
            (request.kind === 'skill' && isAdvancedSkill(request.key)))
    )
        return { ok: false, error: 'ADVANCE_OUT_OF_CAREER' };

    const key = tickKey(request.kind, request.key);

    const tick =
        input.career &&
        outOfCareer === null &&
        !input.career.state.ticks.includes(key)
            ? key
            : undefined;

    const credit =
        request.kind === 'talent'
            ? undefined
            : characteristics.downtime?.training;

    const discounted =
        credit && credit.kind === request.kind && credit.key === request.key
            ? credit
            : undefined;

    const price = discounted ? Math.max(0, cost - discounted.discount) : cost;

    if (input.available < price) return { ok: false, error: 'INSUFFICIENT_XP' };

    const entry: LedgerEntry = {
        id: input.id,
        at: input.now,
        kind: request.kind,
        key: request.key,
        from: priced.from,
        to: priced.to,
        cost: price,
        ...(tick ? { tick } : {}),
        ...(discounted ? { discount: discounted.discount } : {}),
    };

    const stepped = priced.apply(characteristics);

    const ticked =
        tick && input.career
            ? {
                  ...stepped,
                  career: {
                      ...input.career.state,
                      ticks: [...input.career.state.ticks, tick],
                  },
              }
            : stepped;

    const advanced =
        discounted && ticked.downtime
            ? { ...ticked, downtime: withoutTraining(ticked.downtime) }
            : ticked;

    const full = [...advanced.ledger, entry];

    const dropped = full.slice(0, Math.max(0, full.length - LEDGER_MAX));

    const spentArchived =
        advanced.spentArchived + dropped.reduce((sum, e) => sum + e.cost, 0);

    return {
        ok: true,
        next: {
            ...advanced,
            ledger: full.slice(dropped.length),
            spentArchived,
        },
        entry,
    };
}
