import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    findFirst: vi.fn(),
    format: vi.fn((row: unknown) => ({ skill: row })),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: { skill: { findFirst: mocks.findFirst, findMany: vi.fn() } },
}));
vi.mock('@/lib/server/skills/format-skill-response', () => ({
    formatSkillResponse: mocks.format,
}));

import { readSkill } from '@/lib/server/skills/read-skills-list';

describe('readSkill', () => {
    beforeEach(() => vi.clearAllMocks());

    it('reads one skill scoped to its campaign and formats the result', async () => {
        const row = { id: 's1', campaignId: 'c1', name: 'Arcane' };

        mocks.findFirst.mockResolvedValue(row);

        await expect(readSkill('c1', 's1')).resolves.toEqual({ skill: row });
        expect(mocks.findFirst).toHaveBeenCalledWith({
            where: { id: 's1', campaignId: 'c1' },
            include: {
                spell: { select: { id: true, name: true } },
                spellGroup: { select: { id: true, name: true } },
                grantedSpell: { select: { id: true, name: true } },
            },
        });
    });

    it('returns null for a skill that is not in the requested campaign', async () => {
        mocks.findFirst.mockResolvedValue(null);
        await expect(readSkill('c1', 'missing')).resolves.toBeNull();
    });
});
