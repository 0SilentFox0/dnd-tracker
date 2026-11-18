import { describe, expect, it } from 'vitest';

import {
    CSP_REPORT_PATH,
    NONCE_CSP_ENFORCED,
    nonceCsp,
    nonceCspHeaderName,
    usesNonce,
} from '@/lib/security/csp';
import {
    PERMISSIONS_POLICY,
    SECURITY_HEADERS,
    STATIC_CSP_HEADER,
} from '@/next.config';

const header = (key: string) =>
    SECURITY_HEADERS.find((h) => h.key === key)?.value;

describe('security headers', () => {
    it('enforces framing, plugin, base and form restrictions with reporting', () => {
        const csp = header('Content-Security-Policy');

        expect(csp).toContain("frame-ancestors 'self'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("base-uri 'self'");
        expect(csp).toContain(`report-uri ${CSP_REPORT_PATH}`);
        expect(csp).toContain('report-to csp-endpoint');
        expect(header('Reporting-Endpoints')).toContain(CSP_REPORT_PATH);
        expect(header('X-Content-Type-Options')).toBe('nosniff');
        expect(header('Referrer-Policy')).toBe(
            'strict-origin-when-cross-origin'
        );
    });

    it('sets Permissions-Policy and HSTS', () => {
        expect(header('Permissions-Policy')).toBe(PERMISSIONS_POLICY);
        expect(PERMISSIONS_POLICY).toContain('camera=()');
        expect(header('Strict-Transport-Security')).toMatch(/max-age=\d+/);
    });

    it('keeps the static full CSP report-only (frame-ancestors lives in the enforced header)', () => {
        expect(STATIC_CSP_HEADER.key).toBe(
            'Content-Security-Policy-Report-Only'
        );
        expect(STATIC_CSP_HEADER.value).toContain("default-src 'self'");
        expect(STATIC_CSP_HEADER.value).not.toContain('frame-ancestors');
    });

    it('builds the nonce policy only for dynamic prefixes', () => {
        const csp = nonceCsp('abc');

        expect(csp).toContain("'nonce-abc'");
        expect(csp).toContain("'strict-dynamic'");
        expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
        expect(usesNonce('/campaigns/1/dm')).toBe(true);
        expect(usesNonce('/')).toBe(false);
        expect(usesNonce('/en')).toBe(false);
        expect(nonceCspHeaderName()).toBe(
            NONCE_CSP_ENFORCED
                ? 'Content-Security-Policy'
                : 'Content-Security-Policy-Report-Only'
        );
    });
});
