import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCharacterStats = vi.hoisted(() =>
    vi.fn((_: unknown) => ({ dpr: 7, hp: 30 }))
);

vi.mock('@/lib/utils/battle/balance', async (orig) => ({
    ...(await orig<object>()),
    getCharacterStats,
}));
vi.mock('@/lib/utils/skills/progression', () => ({
    normalizeTree: vi.fn((row: unknown) => ({ tree: row })),
    resolveLearned: vi.fn((_t: unknown, progress: unknown) => ({ progress })),
    branchLevels: vi.fn(() => ({ fire: 3 })),
}));

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { D20_BALANCE } from '@/systems/d20/server/balance';

const input = (over: Record<string, unknown> = {}) => ({
    built: createMockParticipant(),
    rules: DEFAULT_RULES,
    character: { race: 'elf', row: { id: 'h1' } },
    campaignContext: undefined,
    ...over,
});

describe('D20_BALANCE', () => {
    beforeEach(() => getCharacterStats.mockClear());

    it('edition comes from the encounters section', () => {
        const rules = {
            ...DEFAULT_RULES,
            encounters: { ...DEFAULT_RULES.encounters, edition: '2024' },
        };

        expect(D20_BALANCE.edition!(rules as never)).toBe('2024');
    });

    it('unitStats returns the d20 reading unchanged', () => {
        const base = { hp: 10, ac: 12 } as never;

        expect(D20_BALANCE.unitStats(base, createMockParticipant())).toBe(base);
    });

    it('heroPower without a campaign context has no branch levels', () => {
        const out = D20_BALANCE.heroPower(input() as never);

        expect(out.levels).toEqual({});
        expect(out.stats).toEqual({ dpr: 7, hp: 30 });
        expect(getCharacterStats.mock.calls[0][0]).toMatchObject({
            branchLevels: {},
            magicMainSkillIds: new Set(),
        });
    });

    it('heroPower reads levels from the race skill tree and flags magic main skills', () => {
        const out = D20_BALANCE.heroPower(
            input({
                campaignContext: {
                    ext: {
                        skilltrees: {
                            treeByRace: { elf: { nodes: [] } },
                            mainSkills: [
                                { id: 'm1', role: 'magic' },
                                { id: 'm2', role: 'martial' },
                            ],
                        },
                    },
                },
            }) as never
        );

        expect(out.levels).toEqual({ fire: 3 });
        expect(getCharacterStats.mock.calls[0][0]).toMatchObject({
            branchLevels: { fire: 3 },
            magicMainSkillIds: new Set(['m1']),
        });
    });

    it('heroPower ignores a tree of another race', () => {
        const out = D20_BALANCE.heroPower(
            input({
                campaignContext: {
                    ext: {
                        skilltrees: {
                            treeByRace: { dwarf: { nodes: [] } },
                            mainSkills: [],
                        },
                    },
                },
            }) as never
        );

        expect(out.levels).toEqual({});
    });
});
