import { Prisma } from '@prisma/client';

export interface ServerErrorClass {
    kind: 'prisma' | 'other';
    code?: 'pool_timeout' | 'unreachable';
}

const UNREACHABLE_CODES = new Set(['P1001', 'P1002', 'P1017']);

export function classifyServerError(error: unknown): ServerErrorClass {
    let prismaCode: string | undefined;

    if (error instanceof Prisma.PrismaClientKnownRequestError)
        prismaCode = error.code;
    else if (error instanceof Prisma.PrismaClientInitializationError)
        prismaCode = error.errorCode;
    else return { kind: 'other' };

    if (prismaCode === 'P2024') return { kind: 'prisma', code: 'pool_timeout' };

    if (prismaCode && UNREACHABLE_CODES.has(prismaCode))
        return { kind: 'prisma', code: 'unreachable' };

    return { kind: 'prisma' };
}
