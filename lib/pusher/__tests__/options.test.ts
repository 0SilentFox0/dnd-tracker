import { describe, expect, it } from 'vitest';

import { pusherClientOptions, pusherServerOptions } from '../config';

describe('pusherServerOptions', () => {
    it('keeps the hosted-cluster behaviour without PUSHER_HOST', () => {
        expect(pusherServerOptions({})).toEqual({ cluster: 'eu', useTLS: true });
    });

    it('targets a self-hosted server via host/port/TLS', () => {
        expect(
            pusherServerOptions({
                PUSHER_HOST: 'ws.example.com',
                PUSHER_PORT: '6001',
                PUSHER_USE_TLS: 'false',
            })
        ).toEqual({ host: 'ws.example.com', port: '6001', useTLS: false });
    });

    it('defaults to TLS and no explicit port', () => {
        expect(pusherServerOptions({ PUSHER_HOST: 'h' })).toEqual({
            host: 'h',
            port: undefined,
            useTLS: true,
        });
    });
});

describe('pusherClientOptions', () => {
    it('keeps the cluster-only options without a ws host', () => {
        expect(pusherClientOptions({ cluster: 'eu' })).toEqual({
            cluster: 'eu',
        });
    });

    it('uses wsHost/ports/ws transports for a self-hosted server', () => {
        expect(
            pusherClientOptions({
                cluster: 'eu',
                wsHost: 'ws.example.com',
                wsPort: '6001',
                forceTLS: '0',
            })
        ).toEqual({
            cluster: 'eu',
            wsHost: 'ws.example.com',
            forceTLS: false,
            enabledTransports: ['ws', 'wss'],
            wsPort: 6001,
            wssPort: 6001,
        });
    });
});
