'use client';

import { useTranslations } from 'next-intl';

import { ChoiceCard } from '@/components/choices/ChoiceCard';
import {
    AbilityPoints,
    Card,
    type CardEntry,
    CardGroups,
    ChoiceSummary,
    OptionCards,
    type PickerContext,
    SpellList,
} from '@/components/choices/ChoicePickerParts';
import { DND_SKILLS } from '@/lib/constants/skills';
import { useTranslator } from '@/lib/i18n/use-translator';
import { MULTICLASS_SKILLS_ID } from '@/lib/utils/characters/choices/class-choices';
import { resolveChoiceCount } from '@/lib/utils/characters/choices/count';
import {
    isUnmet,
    requirementsOf,
} from '@/lib/utils/characters/choices/requirements';
import { summarize } from '@/lib/utils/characters/classes';
import type { Choice, ChoicePick, Picks } from '@/types/choices';

export type { PickerContext };

interface ChoicePickerProps {
    choice: Choice;
    value: ChoicePick[];
    onChange: (next: ChoicePick[]) => void;
    ctx: PickerContext;
    error?: string;
}

export function ChoicePicker({
    choice,
    value,
    onChange,
    ctx,
    error,
}: ChoicePickerProps) {
    const t = useTranslations('choices');

    const tg = useTranslator('gameTerms');

    const target = resolveChoiceCount(choice, ctx.level, ctx.columns);

    const ids = value.map((p) => p.id);

    const toggle = (id: string, extra?: Partial<ChoicePick>) => {
        if (ids.includes(id)) return onChange(value.filter((p) => p.id !== id));

        if (target === 1) return onChange([{ id, ...extra }]);

        if (value.length < target) onChange([...value, { id, ...extra }]);
    };

    const header = (
        <div className="flex items-baseline justify-between gap-2">
            <span className="hud-sc text-sm text-hud-ink">
                {choice.id === MULTICLASS_SKILLS_ID
                    ? t('picker.multiclassSkills')
                    : choice.label}
            </span>
            <span className="text-xs text-hud-muted">{`${value.length} / ${target}`}</span>
        </div>
    );

    return (
        <div className="space-y-2">
            {header}
            {choice.description && (
                <ChoiceSummary title={choice.label} text={choice.description} />
            )}
            {choice.kind === 'option' && (
                <OptionCards
                    choice={choice}
                    ids={ids}
                    level={ctx.level}
                    onToggle={toggle}
                />
            )}
            {choice.kind === 'feat' && (
                <FeatList
                    choice={choice}
                    value={value}
                    ctx={ctx}
                    actions={{ onToggle: toggle, onChange }}
                />
            )}
            {(choice.kind === 'skill' || choice.kind === 'expertise') && (
                <div className="flex flex-wrap gap-2">
                    {(choice.skills?.length ? choice.skills : DND_SKILLS).map(
                        (s) => (
                            <Card
                                key={s}
                                role="checkbox"
                                checked={ids.includes(s)}
                                disabled={
                                    choice.kind === 'expertise' &&
                                    !ctx.proficient.has(s)
                                }
                                onClick={() => toggle(s)}
                                title={tg(`dndSkills.${s}`)}
                            />
                        )
                    )}
                </div>
            )}
            {choice.kind === 'abilityScore' && (
                <AbilityPoints
                    choice={choice}
                    value={value}
                    onChange={onChange}
                    scores={ctx.scores}
                    after={ctx.scoreAfter}
                />
            )}
            {choice.kind === 'spell' && (
                <SpellList
                    choice={choice}
                    ids={ids}
                    ctx={ctx}
                    onToggle={toggle}
                />
            )}
            {value.some((p) => !isKnown(choice, p, ctx)) && (
                <p className="text-xs text-hud-danger">
                    {t('picker.notFound')}
                </p>
            )}
            {error && (
                <p role="alert" className="text-xs text-hud-danger">
                    {error}
                </p>
            )}
        </div>
    );
}

function isKnown(choice: Choice, p: ChoicePick, ctx: PickerContext) {
    if (choice.kind === 'option')
        return !!choice.options?.some((o) => o.id === p.id);

    if (choice.kind === 'feat')
        return (
            !!ctx.featsById[p.id] ||
            !!choice.options?.some((o) => o.id === p.id)
        );

    if (choice.kind === 'spell') return ctx.spells.some((s) => s.id === p.id);

    return true;
}

function FeatList({
    choice,
    value,
    ctx,
    actions,
}: {
    choice: Choice;
    value: ChoicePick[];
    ctx: PickerContext;
    actions: {
        onToggle: (id: string) => void;
        onChange: (next: ChoicePick[]) => void;
    };
}) {
    const t = useTranslations('choices');

    const feats = ctx.feats.filter((f) =>
        (choice.featTypes ?? []).includes(f.type)
    );

    const setNested = (id: string, picks: Picks) =>
        actions.onChange(value.map((p) => (p.id === id ? { ...p, picks } : p)));

    const entries: CardEntry[] = [
        ...(choice.options ?? []).map((o) => ({
            key: o.id,
            available: true,
            card: (
                <ChoiceCard
                    control={{
                        role: 'radio',
                        checked: value.some((p) => p.id === o.id),
                        onClick: () => actions.onToggle(o.id),
                    }}
                    content={{
                        title: o.name,
                        name: o.name,
                        summary: summarize(o.description),
                        description: o.description,
                    }}
                />
            ),
        })),
        ...feats.map((f): CardEntry => {
            const requirements = requirementsOf(f, {
                totalLevel: ctx.totalLevel,
                level: ctx.totalLevel,
                scores: ctx.scores,
            });

            const picked = value.find((p) => p.id === f.id);

            const taken =
                !f.repeatable &&
                !picked &&
                (ctx.featCounts?.get(f.id) ?? 0) > 0;

            const available = !requirements.some(isUnmet) && !taken;

            return {
                key: f.id,
                available,
                card: (
                    <div className="space-y-2">
                        <ChoiceCard
                            control={{
                                role: 'radio',
                                checked: !!picked,
                                disabled: !available && !picked,
                                onClick: () => actions.onToggle(f.id),
                            }}
                            content={{
                                title: f.name,
                                name: f.name,
                                icon: f.icon,
                                summary: summarize(f.description ?? undefined),
                                description: f.description ?? undefined,
                                note: taken ? t('picker.featTaken') : undefined,
                            }}
                            requirements={{ items: requirements }}
                        />
                        {picked && f.choices.length > 0 && (
                            <div className="ml-4 space-y-3 border-l border-hud-line/40 pl-3">
                                {f.choices.map((c) => (
                                    <ChoicePicker
                                        key={c.id}
                                        choice={c}
                                        value={picked.picks?.[c.id] ?? []}
                                        onChange={(list) =>
                                            setNested(f.id, {
                                                ...(picked.picks ?? {}),
                                                [c.id]: list,
                                            })
                                        }
                                        ctx={{
                                            ...ctx,
                                            level: ctx.totalLevel,
                                            columns: [],
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ),
            };
        }),
    ];

    return <CardGroups entries={entries} layout="space-y-2" />;
}
