import { describe, expect, it } from 'vitest';

import { SECURITY_HEADERS } from '@/next.config';

const header = (key: string) =>
    SECURITY_HEADERS.find((h) => h.key === key)?.value;

describe('security headers', () => {
    it('enforces same-origin framing and nosniff', () => {
        expect(header('Content-Security-Policy')).toBe(
            "frame-ancestors 'self'"
        );
        expect(header('X-Content-Type-Options')).toBe('nosniff');
        expect(header('Referrer-Policy')).toBe(
            'strict-origin-when-cross-origin'
        );
    });

    it('keeps the full CSP in report-only mode and restricts plugins', () => {
        const csp = header('Content-Security-Policy-Report-Only');

        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).not.toContain('frame-ancestors');
    });
});
