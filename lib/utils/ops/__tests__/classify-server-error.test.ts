import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { classifyServerError } from '../classify-server-error';

const known = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('x', {
        code,
        clientVersion: 'test',
    });

describe('classifyServerError', () => {
    it('P2024 is a pool timeout', () => {
        expect(classifyServerError(known('P2024'))).toEqual({
            kind: 'prisma',
            code: 'pool_timeout',
        });
    });

    it.each(['P1001', 'P1002', 'P1017'])('%s is unreachable', (code) => {
        expect(classifyServerError(known(code))).toEqual({
            kind: 'prisma',
            code: 'unreachable',
        });
    });

    it('initialization errors use errorCode', () => {
        const error = new Prisma.PrismaClientInitializationError(
            'x',
            'test',
            'P1001'
        );

        expect(classifyServerError(error)).toEqual({
            kind: 'prisma',
            code: 'unreachable',
        });
    });

    it('other prisma codes have no sub-code', () => {
        expect(classifyServerError(known('P2002'))).toEqual({ kind: 'prisma' });
    });

    it('non-prisma errors are other', () => {
        expect(classifyServerError(new Error('boom'))).toEqual({
            kind: 'other',
        });
    });
});
