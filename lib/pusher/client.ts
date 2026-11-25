import PusherClient from 'pusher-js';

import { PUSHER_AUTH_ENDPOINT } from '@/lib/pusher/channels';
import { pusherClientOptions } from '@/lib/pusher/config';

let clientInstance: PusherClient | null = null;

/** One connection per tab. */
export function getPusherClient(): PusherClient | null {
    if (typeof window === 'undefined') return null;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;

    if (!key) return null;

    if (!clientInstance) {
        clientInstance = new PusherClient(key, {
            ...pusherClientOptions(),
            channelAuthorization: {
                endpoint: PUSHER_AUTH_ENDPOINT,
                transport: 'ajax',
            },
        });
    }

    return clientInstance;
}
