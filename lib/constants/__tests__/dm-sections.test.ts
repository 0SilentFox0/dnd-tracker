import { describe, expect, it } from 'vitest';

import {
    dmSectionHref,
    dmSectionsFor,
    dmTilesFor,
} from '@/lib/constants/campaigns';

const paths = (s: { path: string }[]) => s.map((x) => x.path);

describe('dmSectionsFor', () => {
    it('template without classes hides classes, feats, backgrounds and campaign-only sections', () => {
        const p = paths(
            dmSectionsFor({ isTemplate: true, classesEnabled: false })
        );

        for (const hidden of [
            'classes',
            'feats',
            'backgrounds',
            'characters',
            'battles',
            'scenario',
            'show',
            'assistant',
        ])
            expect(p).not.toContain(hidden);

        expect(p).toEqual(
            expect.arrayContaining([
                'spells',
                'units',
                'rules',
                'spell-groups',
                'music',
            ])
        );
    });

    it('hides skill libraries in class (5e) campaigns only', () => {
        const homm = { key: 'homm' };

        expect(
            paths(
                dmSectionsFor({
                    isTemplate: false,
                    classesEnabled: true,
                    system: homm,
                })
            )
        ).not.toContain('skills');
        expect(
            paths(
                dmSectionsFor({
                    isTemplate: false,
                    classesEnabled: true,
                    system: homm,
                })
            )
        ).not.toContain('skill-trees');
        expect(
            paths(
                dmSectionsFor({
                    isTemplate: false,
                    classesEnabled: false,
                    system: homm,
                })
            )
        ).toEqual(expect.arrayContaining(['skills', 'skill-trees']));
        expect(
            paths(
                dmTilesFor({
                    isTemplate: false,
                    classesEnabled: true,
                    system: homm,
                })
            )
        ).not.toContain('skills');
    });

    it('module sections follow the composition (wfrp, bare dnd5e, homm)', () => {
        const menu = (system: { key: string }, classesEnabled = true) =>
            paths(dmSectionsFor({ isTemplate: false, classesEnabled, system }));

        expect(menu({ key: 'wfrp' }, false)).not.toContain('skills');
        expect(menu({ key: 'wfrp' }, false)).not.toContain('classes');
        expect(menu({ key: 'dnd5e' }, false)).not.toContain('skills');
        expect(menu({ key: 'dnd5e' })).toEqual(
            expect.arrayContaining(['classes', 'backgrounds'])
        );
        expect(menu({ key: 'dnd5e' })).not.toContain('artifact-sets');
        expect(menu({ key: 'homm' })).toContain('artifact-sets');
        expect(menu({ key: 'homm' }, false)).toEqual(
            expect.arrayContaining(['skills', 'skill-trees'])
        );
    });

    it('careers link to the system page', () => {
        const careers = dmSectionsFor({
            isTemplate: false,
            classesEnabled: false,
            system: { key: 'wfrp' },
        }).find((s) => s.path === 'careers')!;

        expect(dmSectionHref('c1', careers)).toBe(
            '/campaigns/c1/dm/system/careers'
        );
    });

    it('template menu keeps the API tokens entry', () => {
        expect(
            paths(dmSectionsFor({ isTemplate: true, classesEnabled: false }))
        ).toContain('ai');
    });

    it('template with classes shows the class library', () => {
        expect(
            paths(
                dmSectionsFor({
                    isTemplate: true,
                    classesEnabled: true,
                    system: { key: 'dnd5e' },
                })
            )
        ).toEqual(expect.arrayContaining(['classes', 'feats', 'backgrounds']));
    });

    it('campaign shows characters, battles and scenario', () => {
        expect(
            paths(dmSectionsFor({ isTemplate: false, classesEnabled: false }))
        ).toEqual(
            expect.arrayContaining([
                'characters',
                'battles',
                'scenario',
                'assistant',
                'ai',
            ])
        );
    });

    it('menu and page tiles agree on a template', () => {
        for (const classesEnabled of [false, true]) {
            const ctx = { isTemplate: true, classesEnabled };

            expect(
                paths(dmSectionsFor(ctx)).filter(
                    (p) => !paths(dmTilesFor(ctx)).includes(p)
                )
            ).toEqual([]);
        }
    });

    it('campaign tiles are a subset of the menu and skip template-only tiles', () => {
        const ctx = { isTemplate: false, classesEnabled: true };

        const menu = paths(dmSectionsFor(ctx));

        expect(menu).toEqual(expect.arrayContaining(paths(dmTilesFor(ctx))));
        expect(paths(dmTilesFor(ctx))).toContain('rules');
        expect(paths(dmTilesFor(ctx))).not.toContain('spell-groups');
    });

    it('careers appear only in wfrp campaigns, never on templates', () => {
        expect(
            paths(
                dmSectionsFor({
                    isTemplate: false,
                    classesEnabled: false,
                    system: { key: 'wfrp' },
                })
            )
        ).toContain('careers');
        expect(
            paths(
                dmTilesFor({
                    isTemplate: false,
                    classesEnabled: false,
                    system: { key: 'wfrp' },
                })
            )
        ).toContain('careers');

        for (const system of [{ key: 'dnd5e' }, { key: 'homm' }, undefined])
            expect(
                paths(
                    dmSectionsFor({
                        isTemplate: false,
                        classesEnabled: true,
                        system,
                    })
                )
            ).not.toContain('careers');

        expect(
            paths(
                dmSectionsFor({
                    isTemplate: true,
                    classesEnabled: false,
                    system: { key: 'wfrp' },
                })
            )
        ).not.toContain('careers');
    });
});
