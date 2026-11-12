// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import {
    PLAYER_VIEW_PENDING_ATTR,
    playerViewBootstrap,
    playerViewKey,
} from '@/lib/utils/common/player-view';

afterEach(() => {
    window.sessionStorage.clear();
    document.documentElement.removeAttribute(PLAYER_VIEW_PENDING_ATTR);
});

const run = (code: string) => new Function(code)();

describe('playerViewKey', () => {
    it('matches the flag keys', () => {
        expect(playerViewKey({ kind: 'battle', id: 'b1' })).toBe(
            'player-view:b1'
        );
        expect(playerViewKey({ kind: 'show', id: 'c1' })).toBe(
            'player-view:show:c1'
        );
    });
});

describe('playerViewBootstrap', () => {
    it('marks <html> when the flag is on', () => {
        window.sessionStorage.setItem('player-view:b1', 'on');
        run(playerViewBootstrap({ kind: 'battle', id: 'b1' }));

        expect(
            document.documentElement.hasAttribute(PLAYER_VIEW_PENDING_ATTR)
        ).toBe(true);
    });

    it('leaves <html> alone when off, missing or for another scope', () => {
        window.sessionStorage.setItem('player-view:b1', 'off');
        window.sessionStorage.setItem('player-view:show:c1', 'on');
        run(playerViewBootstrap({ kind: 'battle', id: 'b1' }));
        run(playerViewBootstrap({ kind: 'battle', id: 'b2' }));

        expect(
            document.documentElement.hasAttribute(PLAYER_VIEW_PENDING_ATTR)
        ).toBe(false);
    });

    it('does not throw when storage is unavailable and escapes the key', () => {
        expect(
            playerViewBootstrap({ kind: 'battle', id: '</script>' })
        ).not.toContain('</script>');
        expect(() =>
            run(
                `var sessionStorage={getItem(){throw new Error("x")}};${playerViewBootstrap({ kind: 'show', id: 'c' })}`
            )
        ).not.toThrow();
    });
});
