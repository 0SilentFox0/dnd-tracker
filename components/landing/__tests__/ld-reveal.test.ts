import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
    join(process.cwd(), 'components/landing/landing-motion.css'),
    'utf8'
);

describe('landing .ld-reveal', () => {
    it('only inside reduced-motion no-preference', () => {
        const at = css.indexOf('.ld-reveal {');

        expect(at).toBeGreaterThan(-1);
        expect(css.indexOf('.ld-reveal', at + 1)).toBe(-1);

        const before = css.slice(0, at);

        expect(
            before.lastIndexOf('@media (prefers-reduced-motion: no-preference)')
        ).toBeGreaterThan(before.lastIndexOf('\n}\n'));
    });

    it('fades and rises 24px, mask sweep is gone', () => {
        expect(css).toMatch(
            /@keyframes ld-reveal \{[^}]*opacity: 0[^}]*translateY\(24px\)/
        );
        expect(css).not.toContain('.ld-ink ');
    });
});
