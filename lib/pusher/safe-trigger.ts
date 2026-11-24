/** Never rejects and logs failures with context: a lost event is recovered by the client on reconnect; `after()` awaits the send before the function freezes. */

import type Pusher from 'pusher';

import { incr } from '@/lib/ops/metrics';
import { logger } from '@/lib/utils/common/logger';

export interface PusherTriggerContext {
    action?: string;
    [key: string]: unknown;
}

export function safePusherTrigger(
    pusherServer: Pusher,
    channel: string,
    event: string,
    payload: unknown,
    context?: PusherTriggerContext
): Promise<void> {
    return pusherServer.trigger(channel, event, payload).then(
        () => {
            incr('pusher.trigger', 1, { result: 'ok' });
        },
        (err) => {
            incr('pusher.trigger', 1, { result: 'fail' });
            logger.error(
                '[pusher] trigger failed',
                { channel, event, ...context },
                err
            );
        }
    );
}
