'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminKeys } from './keys';

import {
    banAdminUser,
    deleteAdminUser,
    signOutAdminUser,
    unbanAdminUser,
} from '@/lib/api/admin';
import { ApiError } from '@/lib/api/client';

const blockedTemplateIds = (error: unknown): string[] => {
    if (!(error instanceof ApiError) || error.status !== 409) return [];

    const ids = (error.body as { templateIds?: unknown } | undefined)
        ?.templateIds;

    return Array.isArray(ids) ? ids.map(String) : [];
};

export function useAdminUserActions(id: string) {
    const queryClient = useQueryClient();

    const invalidateUsers = () =>
        queryClient.invalidateQueries({ queryKey: adminKeys.usersAll });

    const onSuccess = () =>
        Promise.all([
            queryClient.invalidateQueries({ queryKey: adminKeys.user(id) }),
            invalidateUsers(),
        ]);

    const remove = useMutation({
        mutationFn: (email: string) => deleteAdminUser(id, email),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: adminKeys.user(id) });

            return invalidateUsers();
        },
    });

    return {
        blockedTemplateIds: blockedTemplateIds(remove.error),
        ban: useMutation({
            mutationFn: (hours: 24 | 168 | 876000) => banAdminUser(id, hours),
            onSuccess,
        }),
        unban: useMutation({
            mutationFn: () => unbanAdminUser(id),
            onSuccess,
        }),
        signOut: useMutation({
            mutationFn: () => signOutAdminUser(id),
            onSuccess,
        }),
        remove,
    };
}
