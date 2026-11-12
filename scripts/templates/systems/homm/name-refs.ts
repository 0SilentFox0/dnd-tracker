import type { Pack, PackRow } from '../../lib/pack';
import type { PackIssue } from '../types';

type Json = Record<string, unknown>;

const isRecord = (v: unknown): v is Json =>
    !!v && typeof v === 'object' && !Array.isArray(v);

/** Race names the engine matches as strings: `condition.races` and `effects[].group`, the two places the overlay maps (D30). */
function raceNameRefs(value: unknown, parentKey = ''): string[] {
    if (Array.isArray(value))
        return value.flatMap((item) => raceNameRefs(item, parentKey));

    if (!isRecord(value)) return [];

    const own = [
        ...(parentKey === 'condition' && Array.isArray(value.races)
            ? value.races.filter((r): r is string => typeof r === 'string')
            : []),
        ...(parentKey === 'effects' && typeof value.group === 'string'
            ? [value.group]
            : []),
    ];

    return [
        ...own,
        ...Object.entries(value).flatMap(([key, child]) =>
            raceNameRefs(child, key)
        ),
    ];
}

const namesOf = (rows: PackRow[] | undefined) =>
    new Set(
        (rows ?? []).map((row) =>
            typeof row.name === 'string' ? row.name : ''
        )
    );

/** String references that stay names in the database must match a row name of the pack exactly (D30). */
export function nameRefIssues(pack: Pack): PackIssue[] {
    if (pack.manifest.include?.length) return [];

    const races = namesOf(pack.rows.races);

    const mainSkills = namesOf(pack.rows['main-skills']);

    const issue = (kind: string, row: PackRow, message: string): PackIssue => ({
        level: 'error',
        kind,
        slug: row.slug,
        message: `${kind} "${row.slug}": ${message}`,
    });

    const rowRefs = Object.entries(pack.rows)
        .filter(([kind]) => kind !== 'skillTrees')
        .flatMap(([kind, rows]) =>
            (rows ?? []).flatMap((row) =>
                [...new Set(raceNameRefs(row))]
                    .filter((name) => !races.has(name))
                    .map((name) =>
                        issue(
                            kind,
                            row,
                            `race name "${name}" is not a race of the pack`
                        )
                    )
            )
        );

    const treeRefs = (pack.rows.skillTrees ?? []).flatMap((row) => {
        const branches =
            isRecord(row.skills) && Array.isArray(row.skills.mainSkills)
                ? row.skills.mainSkills.filter(isRecord)
                : [];

        return [
            ...(races.has(String(row.race))
                ? []
                : [
                      issue(
                          'skillTrees',
                          row,
                          `race "${String(row.race)}" is not a race of the pack`
                      ),
                  ]),
            ...branches.flatMap((branch) =>
                typeof branch.name === 'string' && !mainSkills.has(branch.name)
                    ? [
                          issue(
                              'skillTrees',
                              row,
                              `branch name "${branch.name}" is not a main skill of the pack`
                          ),
                      ]
                    : []
            ),
        ];
    });

    return [...rowRefs, ...treeRefs];
}
