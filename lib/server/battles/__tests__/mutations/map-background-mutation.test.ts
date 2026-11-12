import { beforeEach, describe, expect, it, vi } from 'vitest';

import { context, goblin, hero } from './fixtures';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { mapBackgroundBodySchema } from '@/lib/schemas/battles';
import { createMapBackgroundMutation } from '@/lib/server/battles/mutations/map-background/map-background-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import type { BattleMapConfig } from '@/types/battle';

const resolve = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/battle-map-storage', () => ({
    resolveMapBackgroundForPersistence: resolve,
}));

const map: BattleMapConfig = {
    cols: 10,
    rows: 5,
    background: '/battle-maps/a.webp',
    opacity: 0.3,
    backgroundCols: 12,
    gridOffset: { x: 0.2, y: 0.1 },
    weather: 'fog',
};

const ctx = (m: BattleMapConfig | null = map) => {
    const base = context({ participants: [hero, goblin], isDM: true });

    return { ...base, meta: { ...base.meta, map: m } };
};

beforeEach(() =>
    resolve
        .mockReset()
        .mockImplementation(async (bg: string | null) => ({
            ok: true,
            background: bg,
        }))
);

describe('map-background schema', () => {
    it('приймає null, https і локальний шлях; поле обовʼязкове', () => {
        expect(
            mapBackgroundBodySchema.safeParse({ background: null }).success
        ).toBe(true);
        expect(
            mapBackgroundBodySchema.safeParse({
                background: 'https://x.test/a.png',
            }).success
        ).toBe(true);
        expect(
            mapBackgroundBodySchema.safeParse({
                background: '/battle-maps/b.webp',
            }).success
        ).toBe(true);
        expect(mapBackgroundBodySchema.safeParse({}).success).toBe(false);
        expect(
            mapBackgroundBodySchema.safeParse({
                background: 'javascript:alert(1)',
            }).success
        ).toBe(false);
    });
});

describe('map-background mutation', () => {
    it('міняє фон, скидає вирівнювання фону, решту карти не чіпає', async () => {
        const c = ctx();

        const out = await createMapBackgroundMutation('camp')(c, {
            background: '/battle-maps/b.webp',
        });

        expect(out.scene?.map).toEqual({
            cols: 10,
            rows: 5,
            background: '/battle-maps/b.webp',
            opacity: 0.3,
            weather: 'fog',
        });
        expect(out.events).toEqual([]);
        expect(out.participants).toBe(c.participants);
        expect(resolve).toHaveBeenCalledWith('/battle-maps/b.webp', {
            campaignId: 'camp',
            current: '/battle-maps/a.webp',
        });
    });

    it('зберігає у сцені значення, яке повернуло сховище', async () => {
        resolve.mockResolvedValue({
            ok: true,
            background: 'https://cdn.test/stored.webp',
        });

        const out = await createMapBackgroundMutation('camp')(ctx(), {
            background: 'https://x.test/a.png',
        });

        expect(out.scene?.map?.background).toBe('https://cdn.test/stored.webp');
    });

    it('null повертає стандартний фон', async () => {
        const out = await createMapBackgroundMutation('camp')(ctx(), {
            background: null,
        });

        expect(out.scene?.map?.background).toBeNull();
    });

    it('помилка сховища — відмова з її текстом', async () => {
        resolve.mockResolvedValue({
            ok: false,
            message: API_ERRORS.IMAGE_FORMATS,
        });

        await expect(
            createMapBackgroundMutation('camp')(ctx(), {
                background: 'https://x.test/a.png',
            })
        ).rejects.toThrow(API_ERRORS.IMAGE_FORMATS);
    });

    it('бій без карти — відмова', async () => {
        await expect(
            createMapBackgroundMutation('camp')(ctx(null), { background: null })
        ).rejects.toThrow(BattleRuleError);
    });
});
