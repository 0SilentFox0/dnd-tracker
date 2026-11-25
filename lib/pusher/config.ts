const DEFAULT_PUSHER_CLUSTER = 'eu';

export function getPusherCluster(): string {
    return (
        process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim() || DEFAULT_PUSHER_CLUSTER
    );
}

type Env = Partial<Record<string, string | undefined>>;

const flag = (v: string | undefined, fallback: boolean) =>
    v === undefined || v.trim() === ''
        ? fallback
        : !['0', 'false', 'off'].includes(v.trim().toLowerCase());

const port = (v: string | undefined) => {
    const n = Number.parseInt(v ?? '', 10);

    return n > 0 ? n : undefined;
};

/** Without PUSHER_HOST: hosted Pusher by cluster; with it: any Pusher-protocol server (Soketi). */
export function pusherServerOptions(env: Env = process.env) {
    const host = env.PUSHER_HOST?.trim();

    if (!host) return { cluster: getPusherCluster(), useTLS: true };

    return {
        host,
        port: port(env.PUSHER_PORT)?.toString(),
        useTLS: flag(env.PUSHER_USE_TLS, true),
    };
}

export interface PusherClientEnv {
    cluster: string;
    wsHost?: string;
    wsPort?: string;
    forceTLS?: string;
}

/** Literal NEXT_PUBLIC_* reads: Next inlines them into the client bundle only in this form. */
export function readPusherClientEnv(): PusherClientEnv {
    return {
        cluster: getPusherCluster(),
        wsHost: process.env.NEXT_PUBLIC_PUSHER_WS_HOST,
        wsPort: process.env.NEXT_PUBLIC_PUSHER_WS_PORT,
        forceTLS: process.env.NEXT_PUBLIC_PUSHER_FORCE_TLS,
    };
}

export function pusherClientOptions(env: PusherClientEnv = readPusherClientEnv()) {
    const host = env.wsHost?.trim();

    if (!host) return { cluster: env.cluster };

    const forceTLS = flag(env.forceTLS, true);

    const wsPort = port(env.wsPort);

    return {
        cluster: env.cluster,
        wsHost: host,
        forceTLS,
        enabledTransports: ['ws', 'wss'] as ('ws' | 'wss')[],
        ...(wsPort ? { wsPort, wssPort: wsPort } : {}),
    };
}
