import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { prismaSchemaFiles } from '@/scripts/shared/prisma-schema-files';

const MIGRATION = readFileSync(
    path.resolve(
        __dirname,
        '../migrations/20261121000001_content_base/migration.sql'
    ),
    'utf8'
);

const SCHEMA = prismaSchemaFiles()
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

const DROPPED_IN_MIGRATION = [
    'artifacts.setId',
    'character_skills.skillTreeId',
    'characters.backgroundId',
    'main_skills.spellGroupId',
    'skills.grantedSpellId',
    'skills.mainSkillId',
    'skills.spellGroupId',
    'skills.spellId',
    'skills.spellNewSpellId',
    'spells.groupId',
    'spells.summonUnitId',
    'units.raceId',
];

const EXPECTED = DROPPED_IN_MIGRATION.filter((k) => k !== 'artifacts.setId');

// Relations removed from the schema (P10) while the DB keeps the FK: migrate diff proposes DROP for them.
const INVERSE_DROP = [
    'artifact_sets_campaignId_fkey',
    'skill_tree_progress_character_id_fkey',
    'skill_trees_campaignId_fkey',
];

const dropped = [
    ...MIGRATION.matchAll(
        /^ALTER TABLE "(\w+)" DROP CONSTRAINT "\1_(\w+)_fkey";$/gm
    ),
].map((m) => `${m[1]}.${m[2]}`);

function relationColumns(table: string): string[] {
    for (const m of SCHEMA.matchAll(/^model\s+\w+\s*\{([\s\S]*?)^\}/gm)) {
        if (m[1].includes(`@@map("${table}")`))
            return [
                ...m[1].matchAll(/@relation\([^)]*fields:\s*\[(\w+)\]/g),
            ].map((r) => r[1]);
    }

    return [];
}

describe('content_base FK drop (documented drift, see .claude/rules/db-deploy.md)', () => {
    it('drops exactly the expected constraints', () => {
        expect([...dropped].sort()).toEqual(DROPPED_IN_MIGRATION);
    });

    it.each(EXPECTED)('%s keeps its @relation in the schema', (key) => {
        const [table, column] = key.split('.');

        expect(relationColumns(table)).toContain(column);
    });
});

describe('inverse drift (relation removed from the schema, FK kept in the DB)', () => {
    it.each(['artifact_sets', 'skill_trees'])(
        '%s has no campaign relation in the schema',
        (table) => {
            expect(relationColumns(table)).not.toContain('campaignId');
        }
    );

    it('skill_tree_progress declares no relation (FK is migration-only)', () => {
        expect(relationColumns('skill_tree_progress')).toEqual([]);
    });

    it('artifacts has no set relation in the schema', () => {
        expect(relationColumns('artifacts')).not.toContain('setId');
    });

    it('lists the FKs the schema no longer declares', () => {
        expect(INVERSE_DROP).toEqual([
            'artifact_sets_campaignId_fkey',
            'skill_tree_progress_character_id_fkey',
            'skill_trees_campaignId_fkey',
        ]);
    });
});

describe('later migrations', () => {
    it('never re-add a dropped content FK (prisma migrate dev would generate this: delete it, see .claude/rules/db-deploy.md)', () => {
        const dir = path.resolve(__dirname, '../migrations');

        const later = readdirSync(dir)
            .filter(
                (name) =>
                    /^\d{14}_/.test(name) &&
                    name > '20261121000001_content_base'
            )
            .sort();

        const names = EXPECTED.map(
            (key) => `${key.split('.')[0]}_${key.split('.')[1]}_fkey`
        );

        const offenders = later.flatMap((name) => {
            const sql = readFileSync(
                path.join(dir, name, 'migration.sql'),
                'utf8'
            );

            return names
                .filter((constraint) =>
                    new RegExp(`ADD CONSTRAINT\\s+"${constraint}"`).test(sql)
                )
                .map((constraint) => `${name}: ${constraint}`);
        });

        expect(
            offenders,
            'a migration re-adds a content FK dropped by 20261121000001_content_base; remove that statement (docs: .claude/rules/db-deploy.md)'
        ).toEqual([]);
    });
});
