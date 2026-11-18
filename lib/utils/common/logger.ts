import { Prisma } from '@prisma/client';
import { z } from 'zod';

export interface LogContext {
    [key: string]: unknown;
}

export function serializeError(
    error: unknown
): Record<string, unknown> | string {
    if (error instanceof z.ZodError) {
        return { kind: 'ZodError', issues: error.issues };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return {
            kind: 'PrismaClientKnownRequestError',
            code: error.code,
            message: error.message,
            meta: error.meta,
        };
    }

    if (error instanceof Error) {
        return {
            kind: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    return String(error);
}

function buildPayload(context: LogContext, error?: unknown): LogContext {
    if (error === undefined) return context;

    return { ...context, error: serializeError(error) };
}

export const logger = {
    info(message: string, context: LogContext = {}): void {
        console.info(message, context);
    },

    warn(message: string, context: LogContext = {}, error?: unknown): void {
        console.warn(message, buildPayload(context, error));
    },

    error(message: string, context: LogContext = {}, error?: unknown): void {
        console.error(message, buildPayload(context, error));
    },
};
