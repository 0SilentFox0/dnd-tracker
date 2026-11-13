import { describe, expect, it } from 'vitest';

import { systemScope } from '../system-scope';

describe('systemScope', () => {
    it('keeps the string form: the meta of the key only', () => {
        expect(systemScope('wfrp', 'battle')).toContain('battleWfrp');
        expect(systemScope('homm', 'battle')).toEqual([]);
        expect(systemScope(null, 'battle')).toEqual([]);
    });

    it('follows the composition for the object form', () => {
        expect(systemScope({ key: 'wfrp' }, 'battle')).toContain('battleWfrp');
        expect(systemScope({ key: 'dnd5e', modules: [] }, 'battle')).toEqual(
            []
        );
    });

    it('has no namespaces for an unknown key or a null key', () => {
        expect(systemScope({ key: 'nope' }, 'battle')).toEqual([]);
        expect(systemScope({ key: null }, 'battle')).toEqual([]);
    });

    it('has no duplicates', () => {
        const scope = systemScope({ key: 'wfrp' }, 'battle');

        expect(new Set(scope).size).toBe(scope.length);
    });
});
