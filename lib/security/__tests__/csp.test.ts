import { describe, expect, it } from 'vitest';

import { ENFORCED_CSP, nonceCsp, STATIC_REPORT_ONLY_CSP } from '@/lib/security/csp';

// Vercel Web Analytics loads /_vercel/insights/script.js and posts to /_vercel/insights/view, both same-origin
describe('csp and Vercel Web Analytics', () => {
    it('static policy allows the same-origin script and beacon', () => {
        expect(STATIC_REPORT_ONLY_CSP).toMatch(/script-src 'self'/);
        expect(STATIC_REPORT_ONLY_CSP).toContain("connect-src 'self'");
    });

    it('nonce policy keeps connect-src self and relies on strict-dynamic for the injected script', () => {
        const csp = nonceCsp('abc');

        expect(csp).toContain("connect-src 'self'");
        expect(csp).toContain("'strict-dynamic'");
    });

    it('the enforced baseline does not restrict scripts or connections', () => {
        expect(ENFORCED_CSP).not.toContain('script-src');
        expect(ENFORCED_CSP).not.toContain('connect-src');
    });
});
