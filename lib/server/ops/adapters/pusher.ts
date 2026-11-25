import type { ProviderAdapter } from './types';

import 'server-only';
import { pusherServer } from '@/lib/pusher/server';

export const pusherAdapter: ProviderAdapter = {
    name: 'pusher',
    async collect() {
        if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_SECRET)
            return 'unavailable';

        try {
            const response = await pusherServer.get({ path: '/channels' });

            if (!response.ok) return 'unavailable';

            const body = (await response.json()) as {
                channels?: Record<string, unknown>;
            };

            if (!body.channels) return 'unavailable';

            return [
                {
                    metric: 'channels_occupied',
                    value: Object.keys(body.channels).length,
                },
            ];
        } catch {
            return 'unavailable';
        }
    },
};
