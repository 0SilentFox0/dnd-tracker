import { request } from '@/lib/api/client';

export const accountApi = {
    delete: (email: string) =>
        request<{ success: true }>('/api/account', {
            method: 'DELETE',
            body: JSON.stringify({ email }),
        }),
};

export const deleteAccount = accountApi.delete;
