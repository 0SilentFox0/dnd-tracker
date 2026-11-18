import 'server-only';
import {
    CONTENT_OPERATIONS,
    type ContentOperation,
    CORE_CONTENT_OPERATION_LIST,
} from '@/lib/server/content/operations';
import type { ContentOperationContribution } from '@/lib/server/systems/content-types';
import { systemContent } from '@/lib/server/systems/registry';

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
