import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ops/metrics', () => ({ incr: vi.fn() }));
vi.spyOn(console, 'error').mockImplementation(() => {});

import { handleApiError } from '../error-handler';

import { incr } from '@/lib/ops/metrics';

function prismaError(code: string) {
    return new Prisma.PrismaClientKnownRequestError('x', {
        code,
        clientVersion: 'test',
    });
}

beforeEach(() => vi.mocked(incr).mockClear());

describe('handleApiError metrics', () => {
    it('P2024 counts pool timeout and a prisma 5xx', () => {
        const res = handleApiError(prismaError('P2024'), { action: 't' });

        expect(res.status).toBe(500);
        expect(incr).toHaveBeenCalledWith('db.pool_timeout');
        expect(incr).toHaveBeenCalledWith('api.error5xx', 1, {
            kind: 'prisma',
        });
    });

    it('P1001 counts unreachable', () => {
        handleApiError(prismaError('P1001'), { action: 't' });

        expect(incr).toHaveBeenCalledWith('db.unreachable');
    });

    it('unknown error counts other 5xx only', () => {
        handleApiError(new Error('boom'), { action: 't' });

        expect(incr).toHaveBeenCalledTimes(1);
        expect(incr).toHaveBeenCalledWith('api.error5xx', 1, { kind: 'other' });
    });

    it('does not count handled 4xx', () => {
        handleApiError(prismaError('P2025'), { action: 't' });

        expect(incr).not.toHaveBeenCalled();
    });
});
