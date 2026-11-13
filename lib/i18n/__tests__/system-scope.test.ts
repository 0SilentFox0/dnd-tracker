import { describe, expect, it } from 'vitest';

import { systemScope } from '../system-scope';

describe('systemScope', () => {
    it('has no namespaces for no system', () => {
        expect(systemScope(null, 'battle')).toEqual([]);
    });

    it('follows the composition for the object form', () => {
        expect(systemScope({ key: 'wfrp' }, 'battle')).toContain('battleWfrp');
        expect(systemScope({ key: 'dnd5e', modules: [] }, 'battle')).toEqual(
            []
        );
    });

    it('adds the battle namespace of every composed module', () => {
        expect(
            systemScope({ key: 'dnd5e', modules: ['morale'] }, 'battle')
        ).toEqual(['battleMorale']);
        expect(systemScope({ key: 'homm' }, 'battle')).toContain(
            'battleMorale'
        );
        expect(systemScope({ key: 'dnd5e' }, 'battle')).not.toContain(
            'battleMorale'
        );
    });

    it('has no namespaces for an unknown key or a null key', () => {
        expect(systemScope({ key: 'nope' }, 'battle')).toEqual([]);
        expect(systemScope({ key: null }, 'battle')).toEqual([]);
        expect(
            systemScope({ key: 'dnd5e', modules: ['bogus'] }, 'battle')
        ).toEqual([]);
    });

    it('has no duplicates', () => {
        const scope = systemScope({ key: 'wfrp' }, 'battle');

        expect(new Set(scope).size).toBe(scope.length);
    });
});
