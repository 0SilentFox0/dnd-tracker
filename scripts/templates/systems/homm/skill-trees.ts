import type { PackRow } from '../../lib/pack';
import type { PackRefs } from '../types';

import { newContentId } from '@/lib/server/templates/ids';
import { isPlaceholderSkillId } from '@/lib/utils/skills/progression/ids';

const RACIAL_BRANCH = 'racial';

type Json = Record<string, unknown>;

type Swap = (
    kind: 'main-skills' | 'skills' | 'spell-groups',
    value: string
) => string;

const isLiteral = (kind: string, value: string) =>
    kind === 'main-skills' && value === RACIAL_BRANCH;

const isRecord = (v: unknown): v is Json =>
    !!v && typeof v === 'object' && !Array.isArray(v);

const mapSkill = (swap: Swap) => (v: unknown) =>
    typeof v === 'string' && !isPlaceholderSkillId(v) ? swap('skills', v) : v;

const mapSlots = (levels: unknown, swap: Swap): unknown =>
    isRecord(levels)
        ? Object.fromEntries(
              Object.entries(levels).map(([level, circles]) => [
                  level,
                  isRecord(circles)
                      ? Object.fromEntries(
                            Object.entries(circles).map(([circle, slots]) => [
                                circle,
                                Array.isArray(slots)
                                    ? slots.map((s) =>
                                          isRecord(s)
                                              ? {
                                                    ...s,
                                                    id: mapSkill(swap)(s.id),
                                                }
                                              : s
                                      )
                                    : slots,
                            ])
                        )
                      : circles,
              ])
          )
        : levels;

/** Walks the tree JSON and swaps the ids of main skills, skills and spell groups; other strings (the literal `racial` branch, placeholders) stay. */
function mapTree(skills: unknown, swap: Swap): unknown {
    if (!isRecord(skills)) return skills;

    const branches = Array.isArray(skills.mainSkills)
        ? skills.mainSkills.map((b) => {
              if (!isRecord(b)) return b;

              return {
                  ...b,
                  ...(typeof b.id === 'string' && {
                      id: swap('main-skills', b.id),
                  }),
                  ...(typeof b.spellGroupId === 'string' && {
                      spellGroupId: swap('spell-groups', b.spellGroupId),
                  }),
                  ...(isRecord(b.levelSkillIds) && {
                      levelSkillIds: Object.fromEntries(
                          Object.entries(b.levelSkillIds).map(([level, id]) => [
                              level,
                              mapSkill(swap)(id),
                          ])
                      ),
                  }),
                  ...(b.levels !== undefined && {
                      levels: mapSlots(b.levels, swap),
                  }),
              };
          })
        : skills.mainSkills;

    const ultimate = isRecord(skills.ultimateSkill)
        ? {
              ...skills.ultimateSkill,
              id: mapSkill(swap)(skills.ultimateSkill.id),
          }
        : skills.ultimateSkill;

    return {
        ...skills,
        mainSkills: branches,
        ...(skills.ultimateSkill !== undefined && { ultimateSkill: ultimate }),
    };
}

export function treeToPack(row: Json, refs: PackRefs): PackRow {
    const {
        id: _id,
        race: _race,
        ...skills
    } = isRecord(row.skills) ? row.skills : ({} as Json);

    const swap: Swap = (kind, value) => refs.slugOf(kind, value) ?? value;

    const { skills: _skills, id: _rowId, ...rest } = row;

    return { ...rest, skills: mapTree(skills, swap) } as unknown as PackRow;
}

export function treeFromPack(
    row: PackRow,
    refs: PackRefs & { rowId: string | undefined }
): PackRow {
    const id = refs.rowId ?? newContentId();

    const swap: Swap = (kind, value) => {
        const id = refs.idOf(kind, value);

        if (id === undefined && !isLiteral(kind, value))
            throw new Error(
                `skillTrees "${String(row.race)}": no ${kind} row with slug "${value}"`
            );

        return id ?? value;
    };

    const skills = mapTree(row.skills, swap) as Json;

    return {
        ...row,
        ...(refs.rowId === undefined && { id }),
        skills: { id, race: row.race, ...skills },
    };
}

/** Slugs a tree refers to that no row of the pack carries. */
export function unresolvedTreeSlugs(
    row: PackRow,
    known: Readonly<Record<string, ReadonlySet<string>>>
): string[] {
    const missing: string[] = [];

    mapTree(row.skills, (kind, value) => {
        if (!isLiteral(kind, value) && !known[kind]?.has(value))
            missing.push(`${kind} "${value}"`);

        return value;
    });

    return [...new Set(missing)];
}
