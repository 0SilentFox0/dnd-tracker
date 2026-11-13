import { isDeepStrictEqual } from 'node:util';

import { isRecord } from '@/lib/utils/common/is-record';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { sectionSchemas } from '@/lib/utils/rules/section-shapes';
import {
    type CompositionIssueCode,
    PRESETS,
} from '@/lib/utils/rules/systems/catalog';
import { classlessD20Characters } from '@/lib/utils/rules/systems/classless-report';
import { validateComposition } from '@/lib/utils/rules/systems/compose';
import { legacyParseRules } from '@/scripts/db/lib/legacy-rules-parse';

export type RulesTable = 'campaigns' | 'battle_scenes';

export interface RulesRow {
    table: RulesTable;
    id: string;
    campaignId: string;
    label: string;
    kind?: string;
    status?: string;
    createdFromId?: string | null;
    text: string;
}

export interface FactCharacter {
    id: string;
    campaignId: string;
    name: string;
    level: number;
    class: string;
    classes: unknown;
    archetype: string | null;
    skillTreeProgress: unknown;
    personalSkillId: string | null;
}

export interface CampaignFacts {
    artifactSets: number;
    skillTrees: number;
    skills: number;
    mainSkills: number;
    characters: readonly FactCharacter[];
    classIds: readonly string[];
    activeBattle: boolean;
}

export type SkipReason = 'explicitModules' | 'invalidSystem' | 'notObject';

export type PlanWarning =
    | 'activeBattle'
    | 'legacyUnsafe'
    | 'guessDiffersFromSource';

export interface ModuleReason {
    module: string;
    why: string;
    fromDefault?: true;
}

export interface RowPlan {
    row: Omit<RulesRow, 'text'>;
    action: 'write' | 'unchanged' | 'skip';
    skip?: SkipReason;
    beforeText: string;
    before: unknown;
    after?: { key: string; modules?: string[] };
    keyFrom: 'stored' | 'guess' | null;
    added: ModuleReason[];
    dropped: { module: string; issue: CompositionIssueCode }[];
    warnings: PlanWarning[];
    afterJson?: Record<string, unknown>;
}

const SKIP_LABEL: Record<SkipReason, string> = {
    explicitModules: 'явні modules',
    invalidSystem: 'невалідний system',
    notObject: 'не обʼєкт',
};

const hasOwn = (section: unknown, key: string): boolean =>
    isRecord(section) && Object.hasOwn(section, key);

const nonEmptyProgress = (value: unknown): boolean =>
    Array.isArray(value)
        ? value.length > 0
        : isRecord(value) && Object.keys(value).length > 0;

export function guessKey(raw: Record<string, unknown>): string {
    return legacyParseRules(
        Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'system'))
    ).system.key;
}

export function moduleCandidates(
    raw: Record<string, unknown>,
    facts: CampaignFacts | undefined
): ModuleReason[] {
    const parsed = legacyParseRules(raw);

    const out: ModuleReason[] = [];

    if (parsed.morale.enabled)
        out.push({
            module: 'morale',
            why: 'morale.enabled',
            ...(!hasOwn(raw.morale, 'enabled') && { fromDefault: true }),
        });

    if (parsed.actions.retaliation)
        out.push({
            module: 'retaliation',
            why: 'actions.retaliation',
            ...(!hasOwn(raw.actions, 'retaliation') && { fromDefault: true }),
        });

    const scaling = parsed.heroScaling;

    const defaults = DEFAULT_RULES.heroScaling;

    const heroWhy: string[] = [];

    if (scaling.meleeDiceByLevel !== null || scaling.rangedDiceByLevel !== null)
        heroWhy.push('heroScaling.dice');

    if (
        scaling.hpBaseLevels !== defaults.hpBaseLevels ||
        scaling.hpConCoefficient !== defaults.hpConCoefficient
    )
        heroWhy.push('heroScaling.custom');

    const archetypes =
        facts?.characters.filter((c) => c.archetype !== null).length ?? 0;

    if (archetypes > 0) heroWhy.push(`archetype: ${archetypes}`);

    if (heroWhy.length > 0)
        out.push({ module: 'heroscaling', why: heroWhy.join(', ') });

    if (facts && facts.artifactSets > 0)
        out.push({
            module: 'artifactsets',
            why: `artifact_sets: ${facts.artifactSets}`,
        });

    if (facts) {
        const treeWhy: string[] = [];

        if (facts.skillTrees > 0)
            treeWhy.push(`skill_trees: ${facts.skillTrees}`);

        if (facts.skills > 0) treeWhy.push(`skills: ${facts.skills}`);

        if (facts.mainSkills > 0)
            treeWhy.push(`main_skills: ${facts.mainSkills}`);

        const progress = facts.characters.filter(
            (c) =>
                nonEmptyProgress(c.skillTreeProgress) ||
                c.personalSkillId !== null
        ).length;

        if (progress > 0) treeWhy.push(`tree progress: ${progress}`);

        if (treeWhy.length > 0)
            out.push({ module: 'skilltrees', why: treeWhy.join(', ') });
    }

    return out;
}

export function planRow(
    row: RulesRow,
    facts: CampaignFacts | undefined,
    opts: { skipModules: ReadonlySet<string>; sourceKey?: string }
): RowPlan {
    const { text, ...meta } = row;

    const plan: RowPlan = {
        row: meta,
        action: 'unchanged',
        beforeText: text,
        before: undefined,
        keyFrom: null,
        added: [],
        dropped: [],
        warnings: [],
    };

    let raw: unknown;

    try {
        raw = JSON.parse(text);
    } catch {
        raw = null;
    }

    if (!isRecord(raw)) return { ...plan, action: 'skip', skip: 'notObject' };

    plan.before = raw.system;

    let key: string;

    if (raw.system === undefined) {
        key = guessKey(raw);
        plan.keyFrom = 'guess';
    } else {
        const stored = sectionSchemas.system.safeParse(raw.system);

        if (!stored.success)
            return { ...plan, action: 'skip', skip: 'invalidSystem' };

        if (stored.data.modules !== undefined)
            return { ...plan, action: 'skip', skip: 'explicitModules' };

        key = stored.data.key;
        plan.keyFrom = 'stored';
    }

    const presetModules = [...(PRESETS[key]?.modules ?? [])];

    const accepted = [...presetModules];

    const accept = (candidate: ModuleReason): boolean => {
        const issues = validateComposition({
            key,
            modules: [...accepted, candidate.module],
        });

        if (issues.length > 0) {
            plan.dropped.push({
                module: candidate.module,
                issue: issues[0].code,
            });

            return false;
        }

        accepted.push(candidate.module);
        plan.added.push(candidate);

        return true;
    };

    const finalOf = () => [...new Set(accepted)].sort();

    const withSystem = (modules: readonly string[]) =>
        ({
            ...raw,
            system:
                modules.length > presetModules.length
                    ? { key, modules }
                    : { key },
        }) as Record<string, unknown>;

    if (!opts.skipModules.has(row.campaignId)) {
        for (const candidate of moduleCandidates(raw, facts))
            if (!presetModules.includes(candidate.module)) accept(candidate);

        if (facts && !accepted.includes('heroscaling')) {
            const probe = withSystem(finalOf());

            const classless = classlessD20Characters(
                [{ id: row.campaignId, rules: probe }],
                facts.characters.filter((c) => c.campaignId === row.campaignId),
                facts.classIds.map((id) => ({ id, campaignId: row.campaignId }))
            ).length;

            if (classless > 0)
                accept({
                    module: 'heroscaling',
                    why: `classless: ${classless}`,
                });
        }
    }

    const afterJson = withSystem(finalOf());

    plan.afterJson = afterJson;
    plan.after = afterJson.system as RowPlan['after'];

    plan.action = isDeepStrictEqual(plan.before, plan.after)
        ? 'unchanged'
        : 'write';

    if (
        plan.action === 'write' &&
        (row.table === 'campaigns'
            ? facts?.activeBattle
            : row.status === 'active')
    )
        plan.warnings.push('activeBattle');

    if (plan.after?.modules && guessKey(raw) !== key)
        plan.warnings.push('legacyUnsafe');

    if (
        plan.keyFrom === 'guess' &&
        opts.sourceKey !== undefined &&
        opts.sourceKey !== key
    )
        plan.warnings.push('guessDiffersFromSource');

    return plan;
}

const plannedKey = (plan: RowPlan): string | undefined => {
    if (plan.after) return plan.after.key;

    return isRecord(plan.before) && typeof plan.before.key === 'string'
        ? plan.before.key
        : undefined;
};

export function planAll(
    rows: readonly RulesRow[],
    facts: ReadonlyMap<string, CampaignFacts>,
    skipModules: ReadonlySet<string>
): RowPlan[] {
    const first = rows.map((row) =>
        planRow(row, facts.get(row.campaignId), { skipModules })
    );

    const keyById = new Map(
        first.flatMap((plan, i) => {
            const key = plannedKey(plan);

            return rows[i].table === 'campaigns' && key
                ? [[rows[i].id, key] as const]
                : [];
        })
    );

    return rows.map((row, i) => {
        const sourceKey = row.createdFromId
            ? keyById.get(row.createdFromId)
            : undefined;

        return sourceKey === undefined
            ? first[i]
            : planRow(row, facts.get(row.campaignId), {
                  skipModules,
                  sourceKey,
              });
    });
}

export interface PlanSummary {
    write: number;
    keyOnly: number;
    withModules: number;
    unchanged: number;
    skipped: Record<SkipReason, number>;
    warnings: Record<PlanWarning, number>;
    dropped: number;
}

export function summarizePlans(plans: readonly RowPlan[]): PlanSummary {
    const summary: PlanSummary = {
        write: 0,
        keyOnly: 0,
        withModules: 0,
        unchanged: 0,
        skipped: { explicitModules: 0, invalidSystem: 0, notObject: 0 },
        warnings: {
            activeBattle: 0,
            legacyUnsafe: 0,
            guessDiffersFromSource: 0,
        },
        dropped: 0,
    };

    for (const plan of plans) {
        summary.dropped += plan.dropped.length;

        for (const warning of plan.warnings) summary.warnings[warning]++;

        if (plan.action === 'skip' && plan.skip) summary.skipped[plan.skip]++;
        else if (plan.action === 'unchanged') summary.unchanged++;
        else {
            summary.write++;

            if (plan.after?.modules) summary.withModules++;
            else summary.keyOnly++;
        }
    }

    return summary;
}

const short = (id: string) => `${id.slice(0, 9)}…`;

const reasonText = (r: ModuleReason) =>
    `${r.module} (${r.why}${r.fromDefault ? ', з дефолту' : ''})`;

export function formatPlan(plan: RowPlan): string[] {
    const { row } = plan;

    const head =
        row.table === 'campaigns'
            ? `campaigns  ${row.id} «${row.label}» [${row.kind ?? 'campaign'}${
                  row.createdFromId ? `, клон ${short(row.createdFromId)}` : ''
              }]`
            : `battle_scenes  ${row.id} [${row.status ?? '?'}, кампанія ${short(row.campaignId)}]`;

    const dropped = plan.dropped.length
        ? ` · відкинуто: ${plan.dropped.map((d) => `${d.module} (${d.issue})`).join(', ')}`
        : '';

    if (plan.action === 'skip')
        return [`${head}  пропущено: ${SKIP_LABEL[plan.skip ?? 'notObject']}`];

    if (plan.action === 'unchanged') return [`${head}  без змін${dropped}`];

    const before =
        plan.before === undefined ? '—' : JSON.stringify(plan.before);

    const guess = plan.keyFrom === 'guess' ? '  (здогадка)' : '';

    const added = plan.added.length
        ? `  + ${plan.added.map(reasonText).join(' + ')}`
        : '';

    const warnings = plan.warnings.length
        ? `  ⚠ ${plan.warnings.join(', ')}`
        : '';

    return [
        `${head}  system: ${before} → ${JSON.stringify(plan.after)}${guess}${added}${dropped}${warnings}`,
    ];
}
