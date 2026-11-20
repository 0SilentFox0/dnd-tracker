// Dependency-free: imported by next.config.ts and proxy.ts.
export const CSP_REPORT_PATH = '/api/csp-report';

export const CSP_REPORT_GROUP = 'csp-endpoint';

/** Paths rendered dynamically on every request, so Next can stamp the per-request nonce on its scripts. */
export const NONCE_PATH_PREFIXES = ['/campaigns'];

/** Flip once the report-only nonce policy is clean in production reports. */
export const NONCE_CSP_ENFORCED = false;

const isDev = process.env.NODE_ENV !== 'production';

const REPORTING = [
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_GROUP}`,
];

function mediaOrigin(): string {
    try {
        const raw = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;

        return raw ? ` ${new URL(raw).origin}` : '';
    } catch {
        return '';
    }
}

const RESOURCES = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${mediaOrigin()} https://*.pusher.com wss://*.pusher.com`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
];

// frame-ancestors is ignored in report-only mode, so the enforced baseline carries it
export const ENFORCED_CSP = [
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...REPORTING,
].join('; ');

// static pages cannot carry a nonce, hence 'unsafe-inline' for scripts there
export const STATIC_REPORT_ONLY_CSP = [
    ...RESOURCES,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    ...REPORTING,
].join('; ');

export function nonceCsp(nonce: string): string {
    return [
        ...RESOURCES,
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
        ...REPORTING,
    ].join('; ');
}

export function nonceCspHeaderName(): string {
    return NONCE_CSP_ENFORCED
        ? 'Content-Security-Policy'
        : 'Content-Security-Policy-Report-Only';
}

export function usesNonce(pathname: string): boolean {
    return NONCE_PATH_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
}

export function newNonce(): string {
    return btoa(crypto.randomUUID());
}
