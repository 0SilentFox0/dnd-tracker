import { describe, expect, it } from 'vitest';

import { landingRedirectTarget } from '../landing-redirect';

describe('landingRedirectTarget', () => {
    it('redirects / for the uk cookie', () => {
        expect(landingRedirectTarget({ pathname: '/', cookie: 'uk' })).toBe(
            '/uk'
        );
    });

    it('redirects / by Accept-Language when there is no cookie', () => {
        expect(
            landingRedirectTarget({
                pathname: '/',
                acceptLanguage: 'uk-UA,uk;q=0.9,en;q=0.8',
            })
        ).toBe('/uk');
    });

    it('keeps the cookie above Accept-Language', () => {
        expect(
            landingRedirectTarget({
                pathname: '/',
                cookie: 'en',
                acceptLanguage: 'uk',
            })
        ).toBeNull();
    });

    it('leaves / English without an explicit preference', () => {
        expect(landingRedirectTarget({ pathname: '/' })).toBeNull();
        expect(
            landingRedirectTarget({
                pathname: '/',
                cookie: 'fr',
                acceptLanguage: 'de',
            })
        ).toBeNull();
        expect(
            landingRedirectTarget({
                pathname: '/',
                cookie: '',
                acceptLanguage: '*',
            })
        ).toBeNull();
    });

    it('touches only the root path', () => {
        expect(
            landingRedirectTarget({ pathname: '/uk', cookie: 'en' })
        ).toBeNull();
        expect(
            landingRedirectTarget({ pathname: '/sign-in', cookie: 'uk' })
        ).toBeNull();
    });
});
