'use client';

import { useMutation } from '@tanstack/react-query';

import { deleteAccount } from '@/lib/api/account';
import { createClient } from '@/lib/supabase/client';

export function useDeleteAccount() {
    const mutation = useMutation({
        mutationFn: (email: string) => deleteAccount(email),
        onSuccess: async () => {
            await createClient()
                .auth.signOut({ scope: 'local' })
                .catch(() => undefined);
            window.location.assign('/');
        },
    });

    return {
        remove: (email: string) => mutation.mutateAsync(email).catch(() => {}),
        isPending: mutation.isPending,
        error: mutation.error,
    };
}
