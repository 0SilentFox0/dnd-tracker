import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';

import { exampleOf } from '@/lib/constants/import-aliases';
import type { Locale } from '@/lib/i18n/config';
import {
    createArtifactSchema,
    createBackgroundSchema,
    createCareerSchema,
    createClassSchema,
    createFeatSchema,
    createMainSkillSchema,
    createRaceSchema,
    createSkillSchema,
    createSpellGroupSchema,
    createSpellSchema,
    createUnitSchema,
} from '@/lib/schemas';
import {
    autoMap,
    IMPORT_KINDS,
    IMPORT_SPECS,
    normalizeHeader,
    transformRow,
} from '@/lib/utils/content/import';
import { createArtifactSetSchema } from '@/systems/artifactsets/server/content/schema';
import type { ImportKind } from '@/types/content-import';

const CREATE: Record<ImportKind, ZodType> = {
    units: createUnitSchema,
    spells: createSpellSchema,
    skills: createSkillSchema,
    'main-skills': createMainSkillSchema,
    'spell-groups': createSpellGroupSchema,
    races: createRaceSchema,
    classes: createClassSchema,
    backgrounds: createBackgroundSchema,
    careers: createCareerSchema,
    feats: createFeatSchema,
    artifacts: createArtifactSchema,
    'artifact-sets': createArtifactSetSchema,
};

const exampleRow = (kind: ImportKind, i: 0 | 1, locale: Locale) =>
    Object.fromEntries(
        IMPORT_SPECS[kind].fields.map((f) => [
            f.key,
            exampleOf(locale, kind, f.key)[i],
        ])
    );

describe('IMPORT_SPECS', () => {
    it('є специфікація для кожного виду імпорту', () =>
        expect(Object.keys(IMPORT_SPECS).sort()).toEqual(
            [...IMPORT_KINDS].sort()
        ));

    it.each(IMPORT_KINDS)("%s: одне обов'язкове поле name", (kind) => {
        const { fields } = IMPORT_SPECS[kind];

        expect(fields.filter((f) => f.key === 'name')).toHaveLength(1);
        expect(fields.find((f) => f.key === 'name')?.required).toBe(true);
    });

    it.each(IMPORT_KINDS)(
        '%s: ключ і синоніми не перетинаються між полями',
        (kind) => {
            const owner = new Map<string, string>();

            for (const f of IMPORT_SPECS[kind].fields) {
                for (const alias of [f.key, ...f.aliases]) {
                    const k = normalizeHeader(alias);

                    expect(owner.get(k) ?? f.key, `${kind}: «${alias}»`).toBe(
                        f.key
                    );
                    owner.set(k, f.key);
                }
            }
        }
    );

    it.each(IMPORT_KINDS)('%s: посилання ведуть на відомі види', (kind) => {
        for (const f of IMPORT_SPECS[kind].fields)
            if (f.type === 'ref' || f.type === 'refList')
                expect(IMPORT_KINDS).toContain(f.ref);
    });

    it.each(
        IMPORT_KINDS.flatMap((kind) =>
            (['uk', 'en'] as const).map((locale) => [kind, locale] as const)
        )
    )(
        '%s (%s): обидва рядки прикладу проходять схему створення',
        (kind, locale) => {
            const spec = IMPORT_SPECS[kind];

            for (const i of [0, 1] as const) {
                const row = exampleRow(kind, i, locale);

                const { value, issues } = transformRow(
                    row,
                    autoMap(Object.keys(row), spec.fields),
                    spec.fields
                );

                expect(issues).toEqual([]);

                const parsed = CREATE[kind].safeParse(
                    spec.toBody ? spec.toBody(value, 'create') : value
                );

                expect(
                    parsed.success,
                    JSON.stringify(parsed.error?.issues)
                ).toBe(true);
            }
        }
    );

    it('careers: колонки tierN_* збираються в чотири рівні; три рівні — помилка схеми', () => {
        const spec = IMPORT_SPECS.careers;

        const row = (n: number) => ({
            name: 'Soldier',
            ...Object.fromEntries(
                Array.from({ length: n }, (_, i) => [
                    [`tier${i + 1}_name`, `T${i + 1}`],
                    [`tier${i + 1}_characteristics`, 'ws; bs'],
                    [`tier${i + 1}_skills`, 'athletics; melee'],
                ]).flat()
            ),
        });

        const convert = (n: number) =>
            transformRow(
                row(n),
                autoMap(Object.keys(row(n)), spec.fields),
                spec.fields
            );

        const four = convert(4);

        expect(four.issues).toEqual([]);

        const body = spec.toBody?.(four.value, 'create');

        expect(body).toMatchObject({
            name: 'Soldier',
            tiers: [
                {
                    name: 'T1',
                    characteristics: ['ws', 'bs'],
                    skills: ['athletics', 'melee'],
                    talents: [],
                    trappings: [],
                },
                {},
                {},
                { name: 'T4' },
            ],
        });
        expect(Object.keys(body ?? {})).not.toContain('tier1_name');
        expect(createCareerSchema.safeParse(body).success).toBe(true);
        expect(
            createCareerSchema.safeParse(
                spec.toBody?.(convert(3).value, 'create')
            ).success
        ).toBe(false);
    });

    it('skills: create вкладає групи завжди, update — лише надані', () => {
        expect(IMPORT_SPECS.skills.toBody?.({ name: 'А' }, 'create')).toEqual({
            basicInfo: { name: 'А' },
            spellData: {},
            mainSkillData: {},
        });
        expect(
            IMPORT_SPECS.skills.toBody?.(
                { name: 'А', mainSkillId: 'm1', abilities: [] },
                'update'
            )
        ).toEqual({
            abilities: [],
            basicInfo: { name: 'А' },
            mainSkillData: { mainSkillId: 'm1' },
        });
    });

    it('spells: «8d6» → 8 кісток і грань 6; явна грань лишається; число — як є', () => {
        expect(
            IMPORT_SPECS.spells.toBody?.({ name: 'А', dice: '8d6' }, 'create')
        ).toEqual({ name: 'А', dice: 8, dieSides: 6 });
        expect(
            IMPORT_SPECS.spells.toBody?.(
                { name: 'А', dice: '2d8', dieSides: 10 },
                'create'
            )
        ).toEqual({ name: 'А', dice: 2, dieSides: 10 });
        expect(
            IMPORT_SPECS.spells.toBody?.({ name: 'А', dice: 3 }, 'create')
        ).toEqual({ name: 'А', dice: 3 });
    });

    it('enum-підписи: слот артефакта, роль, тип заклинача, характеристики класу', () => {
        const row = { Назва: 'Меч', Слот: 'зброя' };

        expect(
            transformRow(
                row,
                autoMap(Object.keys(row), IMPORT_SPECS.artifacts.fields),
                IMPORT_SPECS.artifacts.fields
            ).value
        ).toEqual({ name: 'Меч', slot: 'weapon' });

        const cls = {
            Назва: 'Жрець',
            'Тип заклинача': 'Повний заклинач',
            'Рятівні кидки': 'Мудрість, ХАР',
        };

        expect(
            transformRow(
                cls,
                autoMap(Object.keys(cls), IMPORT_SPECS.classes.fields),
                IMPORT_SPECS.classes.fields
            ).value
        ).toEqual({
            name: 'Жрець',
            caster: 'full',
            savingThrows: ['wisdom', 'charisma'],
        });
    });

    it('enum-підписи: рідкість, тип риси, роль основної навички, повні й короткі назви характеристик', () => {
        const run = (
            kind: 'artifacts' | 'feats' | 'main-skills' | 'classes',
            row: Record<string, string>
        ) =>
            transformRow(
                row,
                autoMap(Object.keys(row), IMPORT_SPECS[kind].fields),
                IMPORT_SPECS[kind].fields
            ).value;

        expect(
            run('artifacts', {
                Назва: 'Меч',
                Слот: 'Дальнобійна зброя',
                Рідкість: 'Легендарний',
            })
        ).toEqual({ name: 'Меч', slot: 'range_weapon', rarity: 'legendary' });
        expect(run('feats', { Назва: 'Т', Тип: 'Епічний дар' })).toMatchObject({
            type: 'epicBoon',
        });
        expect(
            run('main-skills', {
                Назва: 'Н',
                Колір: '#fff',
                Роль: 'Персональні',
            })
        ).toMatchObject({ role: 'personal' });
        expect(
            run('classes', {
                Назва: 'К',
                'Рятівні кидки': 'Сила, СПР, ТІЛ, Інтелект, МДР, cha',
            })
        ).toMatchObject({
            savingThrows: [
                'strength',
                'dexterity',
                'constitution',
                'intelligence',
                'wisdom',
                'charisma',
            ],
        });
    });
});
