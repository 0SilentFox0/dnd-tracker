import { describe, expect, it } from 'vitest';

import { systemPackScope, systemScope } from '../system-scope';

describe('systemPackScope', () => {
    it('has no namespaces for no system', () => {
        expect(systemPackScope(null, 'battle')).toEqual([]);
    });

    it('follows the composition for the object form', () => {
        expect(systemPackScope({ key: 'wfrp' }, 'battle')).toContain(
            'battleWfrp'
        );
        expect(
            systemPackScope({ key: 'dnd5e', modules: [] }, 'battle')
        ).toEqual(['battleD20']);
    });

    it('adds the battle namespace of every composed module', () => {
        expect(
            systemPackScope({ key: 'dnd5e', modules: ['morale'] }, 'battle')
        ).toEqual(['battleD20', 'battleMorale']);
        expect(systemPackScope({ key: 'homm' }, 'battle')).toContain(
            'battleMorale'
        );
        expect(systemPackScope({ key: 'dnd5e' }, 'battle')).not.toContain(
            'battleMorale'
        );
    });

    it('has no namespaces for an unknown key or a null key', () => {
        expect(systemPackScope({ key: 'nope' }, 'battle')).toEqual([]);
        expect(systemPackScope({ key: null }, 'battle')).toEqual([]);
        expect(
            systemPackScope({ key: 'dnd5e', modules: ['bogus'] }, 'battle')
        ).toEqual(['battleD20']);
    });

    it('has no duplicates', () => {
        const scope = systemPackScope({ key: 'wfrp' }, 'battle');

        expect(new Set(scope).size).toBe(scope.length);
    });

    it('keeps the page slots separate from packs', () => {
        expect(systemScope({ key: 'wfrp' }, 'draft')).toEqual(['wfrpCreation']);
        expect(systemScope(null, 'character')).toEqual([]);
    });
});
