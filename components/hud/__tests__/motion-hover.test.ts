import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('transitions and hover', () => {
    it('defines the shared interactive transition utility', () => {
        expect(read('components/hud/hud.css')).toContain('.ds-interactive {');
    });

    it('defines page and tab keyframes', () => {
        const globals = read('app/globals.css');

        expect(globals).toContain('@keyframes page-fade');
        expect(globals).toContain('@keyframes tab-panel-in');
    });

    it('disables transitions under reduced motion', () => {
        const motion = read('app/motion.css');

        const block = motion.slice(motion.indexOf('prefers-reduced-motion'));

        expect(block).toContain('.page-transition');
        expect(block).toContain('.ds-interactive');
    });
});
