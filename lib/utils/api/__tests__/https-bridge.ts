import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import type { Mock } from 'vitest';

// Adapts node:https.request onto the stubbed global fetch so tests stay response-driven.
export function bridgeHttpsToFetch(httpsRequestMock: Mock) {
    httpsRequestMock.mockImplementation(
        (
            opts: { host: string; path: string; signal: AbortSignal },
            cb: (res: unknown) => void
        ) => {
            const req = new EventEmitter() as EventEmitter & { end(): void };

            req.end = () => {
                fetch(`https://${opts.host}${opts.path}`, {
                    signal: opts.signal,
                }).then(
                    (res) => {
                        const stream = res.body
                            ? Readable.fromWeb(res.body as never)
                            : Readable.from([]);

                        cb(
                            Object.assign(stream, {
                                statusCode: res.status,
                                headers: Object.fromEntries(res.headers),
                            })
                        );
                    },
                    (e) => req.emit('error', e)
                );
            };

            return req;
        }
    );
}
