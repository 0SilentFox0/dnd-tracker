import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import {
    CONTENT_OPERATIONS,
    type ContentOperation,
    CORE_CONTENT_OPERATION_LIST,
} from '@/lib/server/content/operations';
import type { ContentOperationContribution } from '@/lib/server/systems/content-types';
import { systemContent } from '@/lib/server/systems/registry';
import type { Actor } from '@/lib/utils/api/actor';

export const moduleContentOperations = (): Record<
    string,
    ContentOperationContribution
> => systemContent('operations');

/** Core and module operations; module ids are not known to the core types */
export const contentOperationById = (
    id: string
): ContentOperation | undefined => {
    if (Object.hasOwn(CONTENT_OPERATIONS, id))
        return CONTENT_OPERATIONS[id as keyof typeof CONTENT_OPERATIONS];

    const contribution = moduleContentOperations()[id];

    return contribution && { ...contribution.row, id };
};

export const contentOperationList = (): ContentOperation[] => [
    ...CORE_CONTENT_OPERATION_LIST,
    ...Object.entries(moduleContentOperations()).map(([id, c]) => ({
        ...c.row,
        id,
    })),
];

/** The operation a module-owned route wraps; throws when no installed module provides it */
export const moduleContentOperation = (id: string): ContentOperation => {
    const operation = contentOperationById(id);

    if (!operation) throw new Error(`Unknown content operation: ${id}`);

    return operation;
};

/** Runs a module operation's handler directly, without the kind gate or the write lock of `runContentOperation` */
export const runModuleContentOperation = (
    id: string,
    actor: Actor,
    input: Record<string, unknown>
): Promise<unknown> => {
    const contribution = moduleContentOperations()[id];

    if (!contribution) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

    return contribution.run({
        actor,
        input,
        body: input.body,
        param: (key) => String(input[key]),
    });
};
