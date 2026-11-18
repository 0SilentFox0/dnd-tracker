import { bucketOfHp } from './hp-bucket';
import { type BattleKnowledge, resolveObservedTraits } from './knowledge';

import { ParticipantSide } from '@/lib/constants/battle';
import { lineKey } from '@/lib/i18n/text-ref';
import { findFlags } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf, systemKeyOf } from '@/lib/utils/rules/systems';
import type { ClientBattleDelta } from '@/types/api';
import type { BattleParticipant } from '@/types/battle';
import type { BattleAction, DamageStep } from '@/types/battle-actions';
import type { LogLine } from '@/types/text';

export interface Viewer {
    userId: string | null;
    isDM: boolean;
    readOnly: boolean;
    canSeeEnemyHp: boolean;
}

export function canSeeExactStats(
    p: BattleParticipant,
    viewer: Viewer
): boolean {
    return (
        viewer.isDM ||
        viewer.canSeeEnemyHp ||
        p.basicInfo.side === ParticipantSide.ALLY
    );
}

export function canSeeEnemyHp(
    hero: BattleParticipant | null,
    order: BattleParticipant[]
): boolean {
    if (!hero) return false;

    return (
        findFlags(withSelf(order, hero), hero.basicInfo.id, 'seeEnemyHp')
            .length > 0
    );
}

export function alwaysSeesEnemyStats(
    order: BattleParticipant[],
    userId: string
): boolean {
    const mine = order.filter((p) => p.basicInfo.controlledBy === userId);

    return mine.length > 0 && mine.every((p) => canSeeEnemyHp(p, order));
}

export function deltaTouchesOwned(
    delta: Pick<ClientBattleDelta, 'upserted' | 'patched'>,
    order: BattleParticipant[],
    userId: string
): boolean {
    const ownedIds = new Set(
        order
            .filter((p) => p.basicInfo.controlledBy === userId)
            .map((p) => p.basicInfo.id)
    );

    return (
        delta.upserted.some((p) => p.basicInfo.controlledBy === userId) ||
        (delta.patched ?? []).some(
            (patch) =>
                ownedIds.has(patch.id) ||
                patch.basicInfo?.controlledBy === userId ||
                patch.basicInfo?.side !== undefined
        )
    );
}

export function controlsNonAlly(
    order: BattleParticipant[],
    userId: string
): boolean {
    return order.some(
        (p) =>
            p.basicInfo.controlledBy === userId &&
            p.basicInfo.side !== ParticipantSide.ALLY
    );
}

export const PLAYER_VIEWER: Viewer = {
    userId: null,
    isDM: false,
    readOnly: true,
    canSeeEnemyHp: false,
};

export interface RedactionCtx {
    participants: BattleParticipant[];
    rules: Ruleset;
}

export function sanitizeLogEntry(
    e: BattleAction,
    viewer: Viewer,
    ctx: RedactionCtx
): BattleAction {
    if (viewer.isDM) return e;

    const { participants } = ctx;

    const system = ruleSystemOf(ctx.rules);

    const conditions = system.conditions;

    const hook = system.combat.details;

    const conceal = conditions?.concealLine ?? ((l: LogLine) => l);

    const isMiscastLine = conditions?.isMiscastLine ?? (() => false);

    const hiddenIds = (ids: string[]) =>
        new Set(
            ids.filter((id) => {
                const p = participants.find((x) => x.basicInfo.id === id);

                return !p || !canSeeExactStats(p, viewer);
            })
        );

    const concealed =
        hiddenIds((e.targets ?? []).map((t) => t.participantId)).size > 0;

    const details = e.actionDetails ?? {};

    const actor = participants.find((x) => x.basicInfo.id === e.actorId);

    const sys = details.system;

    const actorHidden = !actor || !canSeeExactStats(actor, viewer);

    const casterConditions =
        ((!!sys && !!hook?.actorSecret(sys)) || !!e.log?.some(isMiscastLine)) &&
        actorHidden;

    const {
        targetAC: _ac,
        damageBreakdown: _b,
        damageRows: _r,
        system: _s,
        ...rest
    } = details;

    const hideNumbers = concealed || !e.targets?.length;

    const stripsNumbers =
        hideNumbers &&
        ('targetAC' in details ||
            'damageBreakdown' in details ||
            'damageRows' in details);

    const redacted =
        sys && hook && sys.key === systemKeyOf(ctx.rules)
            ? hook.redact(sys, { hideNumbers, hideActor: casterConditions })
            : undefined;

    const visible = casterConditions
        ? e.log?.filter((l) => !isMiscastLine(l))
        : e.log;

    const redactLine = hook?.redactLine ?? ((l: LogLine) => l);

    const lines = visible?.map((l) =>
        concealed || casterConditions ? conceal(redactLine(l)) : redactLine(l)
    );

    const linesChanged =
        !!lines &&
        (lines.length !== e.log?.length ||
            lines.some((l, i) => l !== e.log?.[i]));

    const hidden = hiddenIds([
        ...(e.hpChanges ?? []).map((h) => h.participantId),
        ...(details.spellAttacks ?? []).map((a) => a.participantId),
    ]);

    const hpChanges = hidden.size
        ? (e.hpChanges ?? []).map((h) => {
              const p = participants.find(
                  (x) => x.basicInfo.id === h.participantId
              );

              return p && hidden.has(h.participantId)
                  ? {
                        ...h,
                        oldHp: bucketOfHp(p, h.oldHp),
                        newHp: bucketOfHp(p, h.newHp),
                    }
                  : hidden.has(h.participantId)
                    ? { ...h, oldHp: 0, newHp: 0 }
                    : h;
          })
        : e.hpChanges;

    const spellAttacks = details.spellAttacks?.map((a) => {
        if (!hidden.has(a.participantId)) return a;

        const { ac: _hiddenAc, ...open } = a;

        return open;
    });

    const numbersChanged =
        hpChanges !== e.hpChanges ||
        (!!spellAttacks &&
            spellAttacks.some((a, i) => a !== details.spellAttacks?.[i]));

    if (
        !stripsNumbers &&
        !numbersChanged &&
        redacted === sys &&
        !linesChanged &&
        !casterConditions
    )
        return e;

    const { system: _drop, ...full } = details;

    const base = {
        ...(hideNumbers ? rest : full),
        ...(spellAttacks && { spellAttacks }),
    };

    const actionDetails = redacted ? { ...base, system: redacted } : base;

    return { ...e, actionDetails, hpChanges, ...(lines && { log: lines }) };
}

export function redactLogForPlayers(
    entries: BattleAction[],
    ctx: RedactionCtx
): { entries: BattleAction[]; changed: boolean } {
    const redacted = entries.map((e) =>
        sanitizeLogEntry(e, PLAYER_VIEWER, ctx)
    );

    return {
        entries: redacted,
        changed: redacted.some((e, i) => e !== entries[i]),
    };
}

export function hiddenTargetSteps(
    steps: DamageStep[],
    targetId: string,
    log: BattleAction[],
    exact: boolean,
    knowledge?: BattleKnowledge
): DamageStep[] {
    if (exact) return steps;

    const known = new Set(
        resolveObservedTraits(log, targetId, knowledge).map((t) =>
            lineKey(t.label)
        )
    );

    const allKnown = steps.every(
        (s) => s.side === 'attacker' || known.has(lineKey(s.label))
    );

    return allKnown ? steps : steps.filter((s) => s.side === 'attacker');
}
