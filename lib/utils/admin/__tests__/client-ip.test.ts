import { describe, expect, it } from 'vitest';

import { parseClientIp, parseCountry } from '../client-ip';

const headers = (map: Record<string, string>) => ({
    get: (name: string) => map[name.toLowerCase()] ?? null,
});

describe('parseClientIp', () => {
    it('takes the first x-forwarded-for entry', () => {
        expect(
            parseClientIp(
                headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' })
            )
        ).toBe('203.0.113.5');
    });

    it('accepts IPv6', () => {
        expect(
            parseClientIp(headers({ 'x-forwarded-for': ' 2001:db8::1 ' }))
        ).toBe('2001:db8::1');
    });

    it('rejects garbage and overlong values', () => {
        expect(
            parseClientIp(headers({ 'x-forwarded-for': 'garbage' }))
        ).toBeNull();
        expect(
            parseClientIp(headers({ 'x-real-ip': `${'1'.repeat(46)}` }))
        ).toBeNull();
    });

    it('falls back to x-real-ip', () => {
        expect(parseClientIp(headers({ 'x-real-ip': '198.51.100.7' }))).toBe(
            '198.51.100.7'
        );
    });

    it('returns null without headers', () => {
        expect(parseClientIp(headers({}))).toBeNull();
    });
});

describe('parseCountry', () => {
    it('accepts a two-letter uppercase code', () => {
        expect(parseCountry(headers({ 'x-vercel-ip-country': 'UA' }))).toBe(
            'UA'
        );
    });

    it('rejects anything else', () => {
        expect(
            parseCountry(headers({ 'x-vercel-ip-country': 'ua' }))
        ).toBeNull();
        expect(
            parseCountry(headers({ 'x-vercel-ip-country': 'XX1' }))
        ).toBeNull();
        expect(parseCountry(headers({}))).toBeNull();
    });
});
