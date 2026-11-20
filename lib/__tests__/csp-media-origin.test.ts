import { afterEach, describe, expect, it, vi } from 'vitest';

describe('csp media origin', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('allows connect-src to the configured media origin only', async () => {
        vi.stubEnv('NEXT_PUBLIC_MEDIA_BASE_URL', 'https://media.example.dev/x');
        vi.resetModules();

        const { STATIC_REPORT_ONLY_CSP } = await import('@/lib/security/csp');

        expect(STATIC_REPORT_ONLY_CSP).toContain(
            'wss://*.supabase.co https://media.example.dev https://*.pusher.com'
        );
        expect(STATIC_REPORT_ONLY_CSP).not.toContain('*.workers.dev');
    });

    it('adds nothing when the variable is unset or malformed', async () => {
        vi.stubEnv('NEXT_PUBLIC_MEDIA_BASE_URL', 'not a url');
        vi.resetModules();

        const { STATIC_REPORT_ONLY_CSP } = await import('@/lib/security/csp');

        expect(STATIC_REPORT_ONLY_CSP).toContain(
            'wss://*.supabase.co https://*.pusher.com'
        );
    });
});
