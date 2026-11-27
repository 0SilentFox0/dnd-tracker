import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mentionNamesHandler } from '../mention-names-handler';

const mocks = vi.hoisted(() => ({ access: vi.fn(), list: vi.fn() }));

vi.mock('@/lib/server/scenario/mentions', () => ({
    listScenarioMentionNames: mocks.list,
}));
vi.mock('@/lib/utils/api/api-auth', () => ({ requireDM: mocks.access }));

describe('scenario mention names', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.list.mockResolvedValue([
            { type: 'unit', id: 'u1', label: 'Imp' },
        ]);
    });

    it('returns every name to the DM', async () => {
        mocks.access.mockResolvedValue({ userId: 'u1', isDM: true });

        const res = await mentionNamesHandler('c1');

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual([
            { type: 'unit', id: 'u1', label: 'Imp' },
        ]);
        expect(mocks.list).toHaveBeenCalledWith('c1');
    });

    it('rejects non-DM access', async () => {
        mocks.access.mockResolvedValue(
            NextResponse.json({ error: 'x' }, { status: 403 })
        );

        const res = await mentionNamesHandler('c1');

        expect(res.status).toBe(403);
        expect(mocks.list).not.toHaveBeenCalled();
    });
});
