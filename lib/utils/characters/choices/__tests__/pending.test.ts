import { describe, expect, it } from 'vitest';

import { empty, refs, sorcerer } from './fixtures';

import {
    backgroundOpenCount,
    pendingCount,
    pendingIssues,
} from '@/lib/utils/characters/choices/pending';
import { visitPicks } from '@/lib/utils/characters/choices/walk';
import type { ChoicesState } from '@/types/choices';

const pending = (
    state: Partial<ChoicesState>,
    level: number,
    classMode = true,
    race = refs.race
) =>
    pendingCount(
        visitPicks(
            { ...empty, ...state },
            { ...refs, race },
            { level, classMode }
        ),
        refs
    );

const sorc = (level: number, choices = {}) => ({
    classes: [{ classId: sorcerer.id, level, choices }],
});

describe('pendingCount', () => {
    it('race: lineage and Keen Senses; HOMM-like race without choices is 0', () => {
        expect(pending({}, 1, false)).toBe(2);
        expect(
            pending(
                { raceChoices: { 'elven-lineage': [{ id: 'drow' }] } },
                1,
                false
            )
        ).toBe(1);
        expect(pending({}, 1, false, null)).toBe(0);
    });

    it('class: level 1 cantrips 4 + prepared 2; level 2 adds Metamagic 2; column growth reopens slots', () => {
        expect(pending(sorc(1), 1, true, null)).toBe(6);
        expect(pending(sorc(2), 2, true, null)).toBe(8);

        const picked = {
            metamagic: [{ id: 'quickened' }, { id: 'twinned' }],
            'ability-score-improvement-4': [
                {
                    id: 'f-asi',
                    picks: { asi: [{ id: 'strength' }, { id: 'strength' }] },
                },
            ],
        };

        expect(pending(sorc(9, picked), 9, true, null)).toBe(7);
        expect(pending(sorc(10, picked), 10, true, null)).toBe(10);
    });

    it('closed choices are ignored; orphaned picks leave the slot open; class mode off ignores classes', () => {
        expect(
            pending(
                sorc(1, { metamagic: [{ id: 'quickened' }] }),
                1,
                true,
                null
            )
        ).toBe(6);
        expect(
            pending(
                sorc(2, { metamagic: [{ id: 'quickened' }, { id: 'ghost' }] }),
                2,
                true,
                null
            )
        ).toBe(7);
        expect(pending(sorc(2), 2, false, null)).toBe(0);
    });

    it('a picked feat adds its own unpicked nested choices', () => {
        expect(
            pending(
                sorc(4, { 'ability-score-improvement-4': [{ id: 'f-asi' }] }),
                4,
                true,
                null
            )
        ).toBe(11);
        expect(
            pending(
                sorc(4, {
                    'ability-score-improvement-4': [
                        {
                            id: 'f-asi',
                            picks: {
                                asi: [{ id: 'strength' }, { id: 'strength' }],
                            },
                        },
                    ],
                }),
                4,
                true,
                null
            )
        ).toBe(9);
    });
});

describe('pendingCount: spell picks without an available slot level', () => {
    const paladin = { ...sorcerer, id: 'cls-pal', caster: 'half' as const };

    const palRefs = {
        ...refs,
        race: null,
        classesById: { [paladin.id]: paladin },
    };

    const count = (level: number) =>
        pendingCount(
            visitPicks(
                {
                    ...empty,
                    classes: [{ classId: paladin.id, level, choices: {} }],
                },
                palRefs,
                { level, classMode: true }
            ),
            palRefs
        );

    it('level 1 half caster: prepared picks are not required, cantrips still are', () => {
        expect(count(1)).toBe(4);
    });

    it('level 2 half caster has a slot, so prepared picks count again', () => {
        expect(count(2)).toBe(8);
    });
});

describe('backgroundOpenCount', () => {
    const bg = {
        id: 'bg',
        name: 'Sage',
        icon: null,
        description: null,
        choices: [
            {
                id: 'bg-skill',
                label: 'Skill',
                level: 1,
                count: 2,
                kind: 'skill' as const,
            },
        ],
        skillProficiencies: [],
        toolProficiencies: [],
        originFeatId: null,
        equipmentText: null,
    };

    const open = (state: Partial<ChoicesState>) =>
        backgroundOpenCount(
            visitPicks(
                { ...empty, ...state },
                { ...refs, backgroundsById: { bg } },
                { level: 1, classMode: true }
            ),
            refs
        );

    it('0 when nothing is open or no background', () => {
        expect(open({})).toEqual({ count: 0, key: null });
        expect(
            open({
                backgroundId: 'bg',
                backgroundChoices: {
                    'bg-skill': [{ id: 'arcana' }, { id: 'history' }],
                },
            })
        ).toEqual({ count: 0, key: null });
    });

    it('openKey of a nested pick is cut to its wizard step key', () => {
        const visits = [
            {
                choice: {
                    id: 'sub',
                    label: 'S',
                    level: 1,
                    count: 1,
                    kind: 'skill' as const,
                },
                picks: [],
                open: true,
                target: 1,
                path: 'backgroundChoices.feat-pick.0.sub',
            },
        ];

        expect(backgroundOpenCount(visits, refs).key).toBe(
            'backgroundChoices.feat-pick'
        );
    });

    it('counts missing picks and names the first open key, ignoring other owners', () => {
        expect(
            open({
                backgroundId: 'bg',
                backgroundChoices: { 'bg-skill': [{ id: 'arcana' }] },
                ...sorc(1),
            })
        ).toEqual({ count: 1, key: 'backgroundChoices.bg-skill' });
    });
});

describe('pendingIssues', () => {
    it('a feat choice with no feats of its featTypes available never blocks', () => {
        const visit = {
            choice: {
                id: 'asi',
                label: 'Feat',
                level: 1,
                count: 1,
                kind: 'feat' as const,
                featTypes: ['epicBoon' as const],
            },
            picks: [],
            open: true,
            target: 1,
            path: 'classes.x.asi',
        };

        expect(pendingCount([visit], refs)).toBe(1);
        expect(pendingIssues([visit], refs)).toEqual([]);
    });

    const issues = (state: Partial<ChoicesState>, level: number, mode = true) =>
        pendingIssues(
            visitPicks({ ...empty, ...state }, refs, {
                level,
                classMode: mode,
            }),
            refs
        );

    it('race and class shortfalls give their paths', () => {
        const paths = issues(
            { raceChoices: { 'elven-lineage': [{ id: 'drow' }] }, ...sorc(1) },
            1
        ).map((i) => i.path);

        expect(paths).toContain('raceChoices.keen-senses');
        expect(paths).toContain(`classes.${sorcerer.id}.cantrips`);
        expect(paths).not.toContain('raceChoices.elven-lineage');
    });

    it('a nested feat choice is reported', () => {
        const nested = issues(
            {
                feats: [{ id: 'f-asi', source: 'dm' }],
                raceChoices: {
                    'elven-lineage': [{ id: 'drow' }],
                    'keen-senses': [{ id: 'insight' }],
                },
            },
            1
        );

        expect(nested.some((i) => /^feats\.0\./.test(i.path))).toBe(true);
    });

    it('a spell choice with fewer listed spells than count is capped to the available ones', () => {
        const state = { ...empty, ...sorc(1) };

        const visits = visitPicks(state, { ...refs, race: null }, {
            level: 1,
            classMode: true,
        });

        const none = pendingIssues(visits, { ...refs, spellsById: {} });

        expect(none.some((i) => i.path.endsWith('.cantrips'))).toBe(false);

        const cantrip = Object.values(refs.spellsById).find(
            (s) => s.level === 0 && s.lists.includes('Sorcerer')
        )!;

        const one = pendingIssues(visits, {
            ...refs,
            spellsById: { [cantrip.id]: cantrip },
        });

        expect(one.some((i) => i.path.endsWith('.cantrips'))).toBe(true);

        const full = visitPicks(
            {
                ...empty,
                ...sorc(1, { cantrips: [{ id: cantrip.id }] }),
            },
            { ...refs, race: null },
            { level: 1, classMode: true }
        );

        expect(
            pendingIssues(full, {
                ...refs,
                spellsById: { [cantrip.id]: cantrip },
            }).some((i) => i.path.endsWith('.cantrips'))
        ).toBe(false);
    });

    it('an unreachable spell choice is skipped; a full set is empty', () => {
        const high = {
            ...sorcerer,
            features: [
                {
                    ...sorcerer.features[0],
                    choices: [
                        {
                            ...sorcerer.features[0]!.choices![1]!,
                            id: 'high',
                            spells: {
                                lists: ['Sorcerer'],
                                minLevel: 9,
                                maxLevel: 'slots' as const,
                            },
                        },
                    ],
                },
            ],
        };

        const paths = pendingIssues(
            visitPicks(
                { ...empty, ...sorc(1) },
                { ...refs, race: null, classesById: { [sorcerer.id]: high } },
                { level: 1, classMode: true }
            ),
            refs
        ).map((i) => i.path);

        expect(paths.some((p) => p.endsWith('.high'))).toBe(false);
        expect(
            issues(
                {
                    raceChoices: {
                        'elven-lineage': [{ id: 'drow' }],
                        'keen-senses': [{ id: 'insight' }],
                    },
                },
                1,
                false
            )
        ).toEqual([]);
    });
});
