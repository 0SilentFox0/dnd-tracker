import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ops/metrics', () => ({ incr: vi.fn(), observe: vi.fn() }));

import { incr } from '@/lib/ops/metrics';
import { battleErrorResponse } from '@/lib/server/battles/run-mutation';
import { BattleConflictError } from '@/lib/utils/battle/store';

beforeEach(() => vi.mocked(incr).mockClear());

describe('battleErrorResponse metrics', () => {
    it('counts a conflict', () => {
        const res = battleErrorResponse(new BattleConflictError(3));

        expect(res.status).toBe(409);
        expect(incr).toHaveBeenCalledWith('battle.conflict');
    });
});
