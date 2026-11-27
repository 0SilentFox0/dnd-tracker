'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminKeys } from './keys';

import {
    banAdminUser,
    deleteAdminUser,
    signOutAdminUser,
    unbanAdminUser,
} from '@/lib/api/admin';

export function useAdminUserActions(id: string) {
    const queryClient = useQueryClient();

    const onSuccess = () =>
        Promise.all([
            queryClient.invalidateQueries({ queryKey: adminKeys.user(id) }),
            queryClient.invalidateQueries({
                queryKey: [...adminKeys.all, 'users'],
            }),
        ]);

    return {
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
        remove: useMutation({
            mutationFn: (email: string) => deleteAdminUser(id, email),
            onSuccess,
        }),
    };
}
