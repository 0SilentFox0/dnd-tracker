import { describe, expect, it } from 'vitest';

import { NAMESPACES } from '../config';
import {
    CAMPAIGN_BASE,
    PACKS,
    ROUTE_SCOPES,
    routeNamespaces,
    systemPackScope,
} from '../route-scopes';

describe('route scope model', () => {
    it('every pack namespace exists and packs do not repeat the base', () => {
        for (const ns of Object.values(PACKS).flat()) {
            expect(NAMESPACES).toContain(ns);
            expect(CAMPAIGN_BASE).not.toContain(ns);
        }
    });

    it('every route points at known packs', () => {
        for (const packs of Object.values(ROUTE_SCOPES))
            for (const pack of packs) expect(PACKS).toHaveProperty(pack);
    });

    it('a null system gets only core namespaces', () => {
        expect(routeNamespaces('[id]/battles', null)).toEqual(
            expect.arrayContaining(['battle', 'battleLog'])
        );
        expect(
            routeNamespaces('[id]/battles', null).some((ns) =>
                ns.startsWith('wfrp')
            )
        ).toBe(false);
    });

    it('wfrp keeps every namespace it had before on the matching routes', () => {
        const wfrp = { key: 'wfrp' };

        expect(routeNamespaces('[id]/battles', wfrp)).toEqual(
            expect.arrayContaining(['battleWfrp'])
        );
        expect(routeNamespaces('[id]/character', wfrp)).toEqual(
            expect.arrayContaining([
                'wfrpEquipment',
                'wfrpMagic',
                'wfrpAdvancement',
                'wfrpDowntime',
                'wfrpCorruption',
            ])
        );
        expect(routeNamespaces('[id]/character/draft', wfrp)).toEqual(
            expect.arrayContaining(['wfrpCreation'])
        );
        expect(routeNamespaces('[id]/dm/rules', wfrp)).toEqual(
            expect.arrayContaining([
                'battleWfrp',
                'wfrpDowntime',
                'wfrpCorruption',
            ])
        );
        expect(routeNamespaces('[id]/dm/rules', null)).not.toContain('battle');
    });

    it('a d20 campaign gets battleD20 only through the battle pack', () => {
        expect(
            systemPackScope({ key: 'dnd5e', modules: [] }, 'battle')
        ).toContain('battleD20');
        expect(
            systemPackScope({ key: 'dnd5e', modules: [] }, 'characterSheet')
        ).not.toContain('battleD20');
    });

    it('the battle route also carries the module log scopes', () => {
        expect(
            routeNamespaces('[id]/battles', {
                key: 'dnd5e',
                modules: ['morale'],
            })
        ).toEqual(expect.arrayContaining(['moraleLog', 'battleMorale']));
    });
});
