import { request } from '@/lib/api/client';
import type { SlideUploadTicket } from '@/types/show';

export const profileApi = {
    avatarTicket: (contentType: string) =>
        request<SlideUploadTicket>('/api/profile/avatar/ticket', {
            method: 'POST',
            body: JSON.stringify({ contentType }),
        }),
    commitAvatar: (url: string) =>
        request<{ avatarUrl: string }>('/api/profile/avatar', {
            method: 'PUT',
            body: JSON.stringify({ url }),
        }),
    removeAvatar: () =>
        request<{ ok: true }>('/api/profile/avatar', { method: 'DELETE' }),
};
