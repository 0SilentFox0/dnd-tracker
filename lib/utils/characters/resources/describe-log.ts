import type { CharacterLogEntry } from '@/types/characters';
import type { LogLine } from '@/types/text';

export interface DescribedLog {
    key: string;
    params?: Record<string, string | number>;
    textParams?: Record<string, LogLine>;
}

export function describeCharacterLog(
    e: Pick<CharacterLogEntry, 'kind' | 'data'>
): DescribedLog {
    const d = e.data;

    const num = (k: string) =>
        typeof d[k] === 'number' ? (d[k] as number) : 0;

    const yes = (v: unknown) => (v ? 'yes' : 'no');

    switch (e.kind) {
        case 'check':
        case 'save':
            return {
                key: 'rest.log.roll',
                params: {
                    hasLabel: yes(d.label),
                    label: String(d.label ?? ''),
                    autoFail: yes(d.autoFail),
                    rolls: Array.isArray(d.rolls)
                        ? (d.rolls as number[]).join(' / ')
                        : '',
                    total: num('total'),
                    mode: String(d.mode),
                    inspiration: yes(d.inspiration),
                },
            };
        case 'test':
            return {
                key: 'rest.log.test',
                params: {
                    label: String(d.label ?? ''),
                    roll: num('roll'),
                    target: num('target'),
                    sl: num('sl'),
                    outcome: String(d.outcome),
                    reversed: yes(d.reversed),
                    auto:
                        d.auto === 'success' || d.auto === 'failure'
                            ? d.auto
                            : 'none',
                    difficulty: String(d.difficulty),
                },
            };
        case 'session':
            return { key: 'rest.log.session' };
        case 'short_rest':
            return { key: 'rest.log.shortRest' };
        case 'long_rest':
            return { key: 'rest.log.longRest' };
        case 'rest_closed':
            return { key: 'rest.log.restClosed' };
        case 'hit_die':
            return {
                key: 'rest.log.hitDie',
                params: {
                    die: num('die'),
                    roll: num('roll'),
                    healed: num('healed'),
                    hpBefore: num('hpBefore'),
                    hpAfter: num('hpAfter'),
                },
            };
        case 'arcane_recovery':
            return {
                key: 'rest.log.arcaneRecovery',
                params: { levels: num('levels') },
            };
        case 'xp':
            return {
                key: 'rest.log.xp',
                params: {
                    amount: `${num('amount') > 0 ? '+' : ''}${num('amount')}`,
                    total: num('total'),
                    hasNote: yes(typeof d.note === 'string'),
                    note: typeof d.note === 'string' ? d.note : '',
                },
            };
        case 'advance':
            return {
                key: d.undo ? 'rest.log.advanceUndo' : 'rest.log.advance',
                params: {
                    kind: String(d.kind),
                    key: String(d.key),
                    from: num('from'),
                    to: num('to'),
                    cost: num('cost'),
                },
            };
        case 'career_set':
            return {
                key: 'rest.log.careerSet',
                params: { name: String(d.name ?? '') },
            };
        case 'career_advance':
            return {
                key: 'rest.log.careerAdvance',
                params: { tier: num('tier') },
            };
        case 'inspiration':
            return {
                key: d.value
                    ? 'rest.log.inspirationGained'
                    : 'rest.log.inspirationRemoved',
            };
        case 'resources_edit':
            return { key: 'rest.log.resourcesEdit' };
        case 'choices_edit':
            return { key: 'rest.log.choicesEdit' };
        case 'downtime':
            return {
                key: d.undo ? 'rest.log.downtimeUndo' : 'rest.log.downtime',
                params: { days: num('days') },
            };
        case 'corruption':
            return d.undo
                ? { key: 'rest.log.corruptionUndo' }
                : describeCorruptionGrant(d);
        case 'battle_result':
            return {
                key: 'rest.log.battleResult',
                params: {
                    hpBefore: num('hpBefore'),
                    hpAfter: num('hpAfter'),
                    maxHp: num('maxHp'),
                    dead: yes(d.dead),
                },
            };
    }
}

function describeCorruptionGrant(d: Record<string, unknown>): DescribedLog {
    const num = (v: unknown) => (typeof v === 'number' ? v : 0);

    const summary = (d.summary ?? {}) as {
        test?: {
            roll?: unknown;
            target?: unknown;
            sl?: unknown;
            outcome?: unknown;
        };
        mutation?: { text?: LogLine };
    };

    const { test, mutation } = summary;

    const reason = typeof d.reason === 'string' ? d.reason : '';

    return {
        key:
            d.mutation === true
                ? 'rest.log.corruptionMutation'
                : 'rest.log.corruption',
        params: {
            points: num(d.points),
            total: num(d.total),
            threshold: num(d.threshold),
            hasReason: reason ? 'yes' : 'no',
            reason,
            testState: !test
                ? 'none'
                : test.outcome === 'success' || test.outcome === 'critical'
                  ? 'passed'
                  : 'failed',
            roll: num(test?.roll),
            target: num(test?.target),
            sl: num(test?.sl),
        },
        textParams: mutation?.text
            ? { mutationText: mutation.text }
            : undefined,
    };
}
