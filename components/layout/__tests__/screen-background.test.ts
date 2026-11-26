import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { screenBackgroundFor } from '@/components/layout/screen-background';

const root = process.cwd();

const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8');

describe('shared background', () => {
    it('paints the tavern picture only under the tavern palette', () => {
        expect(css).toMatch(
            /html\[data-palette="tavern"\] body::after[^}]*url\("\/bg\/vey-strait-2k\.webp"\)/
        );
        expect(css).toMatch(/\(min-width: 1921px\)/);
        expect(css).not.toMatch(
            /parchment[^{]*body::after[^}]*url\("\/bg\//
        );
    });

    it('has no per-screen background rules', () => {
        expect(css).not.toContain('data-screen-bg');
    });
});

describe('screenBackgroundFor', () => {
    it.each([
        ['/campaigns/1/character', 'character'],
        ['/campaigns/1/battles/2', 'battle'],
        ['/campaigns/1/dm/battles', 'battle'],
        ['/campaigns/1/dm/system/skill-trees', 'skill-tree'],
        ['/campaigns/1/dm/compendium', 'races'],
        ['/campaigns/1/dm/main-skills', 'skills'],
        ['/campaigns/1/dm/print/spells', 'spells'],
        ['/campaigns/1/dm/artifacts/new', 'artifacts'],
    ])('%s -> %s', (path, name) => {
        expect(screenBackgroundFor(path)).toBe(name);
    });

    it.each([
        '/',
        '/campaigns',
        '/campaigns/1',
        '/campaigns/1/dm/system/artifact-sets',
        '/campaigns/1/dm/print/other',
        '/sign-in',
    ])('%s -> tavern', (path) => {
        expect(screenBackgroundFor(path)).toBeNull();
    });
});
