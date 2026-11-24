import { describe, expect, it } from 'vitest';

import { filterLog, logChannel } from '../log-channel';

const mk = (
    actionType: string,
    actionDetails: Record<string, unknown> = {}
) => ({ actionType, actionDetails }) as never;

describe('logChannel', () => {
    it.each([
        ['attack', {}, 'battle'],
        ['spell', {}, 'battle'],
        ['end_turn', {}, 'system'],
        ['skip_turn', {}, 'system'],
        ['attack', { battleResult: 'victory' }, 'system'],
        ['ability', { mazeEvent: 'op' }, 'system'],
        ['ability', { hazard: { name: 'x' } }, 'system'],
    ])('%s %j -> %s', (type, details, expected) => {
        expect(logChannel(mk(type, details))).toBe(expected);
    });
});

describe('filterLog', () => {
    const entries = [mk('attack'), mk('end_turn'), mk('spell')];

    it('all keeps everything', () => {
        expect(filterLog(entries, 'all')).toHaveLength(3);
    });

    it('splits battle and system', () => {
        expect(filterLog(entries, 'battle')).toHaveLength(2);
        expect(filterLog(entries, 'system')).toHaveLength(1);
    });
});
