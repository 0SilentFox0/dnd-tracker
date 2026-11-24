// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { HUD_GLASS } from '@/components/hud';

const css = readFileSync(
    join(process.cwd(), 'components/battle/hud/battle-hud.css'),
    'utf8'
);

describe('HUD_GLASS', () => {
    it('is exported and defined in the battle hud css', () => {
        expect(HUD_GLASS).toBe('hud-glass');
        expect(css).toContain(`.${HUD_GLASS} {`);
        expect(css).toContain('backdrop-filter: blur(14px)');
    });

    it('has a light variant for parchment and frost', () => {
        for (const palette of ['parchment', 'frost']) {
            expect(css).toContain(`html[data-palette="${palette}"] .${HUD_GLASS}`);
        }
    });
});
