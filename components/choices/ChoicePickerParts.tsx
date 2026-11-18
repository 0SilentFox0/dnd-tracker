'use client';

import { Fragment, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { ChoiceCard, DetailsButton } from '@/components/choices/ChoiceCard';
import { HudButton } from '@/components/hud';
import { OptionButton } from '@/components/hud/OptionButton';
import {
    ABILITY_KEYS,
    ABILITY_SCORE_CAP,
    type AbilityKey,
} from '@/lib/constants/abilities';
import { type DndSkill } from '@/lib/constants/skills';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    isUnmet,
    requirementsOf,
} from '@/lib/utils/characters/choices/requirements';
import { summarize } from '@/lib/utils/characters/classes';
import type { Choice, ChoicePick, FeatData, SpellRef } from '@/types/choices';
import type { ClassColumn } from '@/types/classes';

export interface PickerContext {
    level: number;
    totalLevel: number;
    columns?: readonly ClassColumn[];
    maxSlotLevel: number;
    feats: FeatData[];
    featsById: Readonly<Record<string, FeatData>>;
    spells: SpellRef[];
    proficient: ReadonlySet<DndSkill>;
    scores: Record<AbilityKey, number>;
    scoreAfter?: Record<AbilityKey, number>;
    featCounts?: ReadonlyMap<string, number>;
}

export function Card({
    role,
    checked,
    disabled,
    onClick,
    title,
    note,
}: {
    role: 'checkbox' | 'radio';
    checked: boolean;
    disabled?: boolean;
    onClick: () => void;
    title: string;
    note?: string;
}) {
    return (
        <OptionButton
            variant="form"
            role={role}
            checked={checked}
            disabled={disabled}
            onClick={onClick}
            text={{ title: title, note: note }}
        />
    );
}

export const NO_SCORES = Object.fromEntries(
    ABILITY_KEYS.map((k) => [k, 0])
) as Record<AbilityKey, number>;

export function ChoiceSummary({
    title,
    text,
}: {
    title: string;
    text: string;
}) {
    const summary = summarize(text);

    return (
        <p className="flex items-center gap-1 text-xs text-hud-muted">
            {summary}
            {summary !== text.trim() && (
                <DetailsButton title={title} text={text.trim()} />
            )}
        </p>
    );
}

export interface CardEntry {
    key: string;
    available: boolean;
    card: ReactNode;
}

export function CardGroups({
    entries,
    layout,
}: {
    entries: CardEntry[];
    layout: string;
}) {
    const t = useTranslations('choices');

    const available = entries.filter((e) => e.available);

    const unavailable = entries.filter((e) => !e.available);

    const group = (list: CardEntry[]) => (
        <div className={layout}>
            {list.map((e) => (
                <Fragment key={e.key}>{e.card}</Fragment>
            ))}
        </div>
    );

    return (
        <div className="space-y-3">
            {available.length > 0 && (
                <div className="space-y-1">
                    {unavailable.length > 0 && (
                        <p className="hud-sc text-xs text-hud-muted">
                            {t('picker.available')}
                        </p>
                    )}
                    {group(available)}
                </div>
            )}
            {unavailable.length > 0 && (
                <div className="space-y-1">
                    <p className="hud-sc text-xs text-hud-muted">
                        {t('picker.unavailable')}
                    </p>
                    {group(unavailable)}
                </div>
            )}
        </div>
    );
}

export function OptionCards({
    choice,
    ids,
    level,
    onToggle,
}: {
    choice: Choice;
    ids: string[];
    level: number;
    onToggle: (id: string) => void;
}) {
    const names = Object.fromEntries(
        (choice.options ?? []).map((o) => [o.id, o.name])
    );

    const picked = new Set(ids);

    const entries = (choice.options ?? []).map((o): CardEntry => {
        const requirements = requirementsOf(o, {
            totalLevel: level,
            level,
            scores: NO_SCORES,
            picked,
        });

        const available = !requirements.some(isUnmet);

        return {
            key: o.id,
            available,
            card: (
                <ChoiceCard
                    control={{
                        role: 'checkbox',
                        checked: picked.has(o.id),
                        disabled: !available && !picked.has(o.id),
                        onClick: () => onToggle(o.id),
                    }}
                    content={{
                        title: o.name,
                        name: o.name,
                        summary: summarize(o.description),
                        description: o.description,
                    }}
                    requirements={{ items: requirements, names }}
                />
            ),
        };
    });

    return <CardGroups entries={entries} layout="grid gap-2 sm:grid-cols-2" />;
}

export function AbilityPoints({
    choice,
    value,
    onChange,
    scores,
    after: scoreAfter,
}: {
    choice: Choice;
    value: ChoicePick[];
    onChange: (next: ChoicePick[]) => void;
    scores: Record<AbilityKey, number>;
    after?: Record<AbilityKey, number>;
}) {
    const tg = useTranslator('gameTerms');

    const points = choice.points ?? 1;

    const max = choice.max ?? ABILITY_SCORE_CAP;

    const allowed = choice.abilities?.length ? choice.abilities : ABILITY_KEYS;

    return (
        <div className="space-y-1">
            {allowed.map((a) => {
                const added = value.filter((p) => p.id === a).length;

                const after = scoreAfter?.[a] ?? scores[a] + added;

                return (
                    <div key={a} className="flex items-center gap-2 text-sm">
                        <span className="w-28">
                            {tg(`abilities.${a}.label`)}
                        </span>
                        <HudButton
                            type="button"
                            aria-label={`−1 ${tg(`abilities.${a}.label`)}`}
                            disabled={added === 0}
                            onClick={() =>
                                onChange(
                                    value.filter(
                                        (p, i) =>
                                            !(
                                                p.id === a &&
                                                i ===
                                                    value
                                                        .map((x) => x.id)
                                                        .lastIndexOf(a)
                                            )
                                    )
                                )
                            }
                            className="rounded border border-hud-line/50 px-2 disabled:opacity-40"
                        >
                            −
                        </HudButton>
                        <HudButton
                            type="button"
                            aria-label={`+1 ${tg(`abilities.${a}.label`)}`}
                            disabled={
                                value.length >= points ||
                                after + 1 > max ||
                                (choice.maxPerAbility !== undefined &&
                                    added >= choice.maxPerAbility)
                            }
                            onClick={() => onChange([...value, { id: a }])}
                            className="rounded border border-hud-line/50 px-2 disabled:opacity-40"
                        >
                            +
                        </HudButton>
                        {after !== scores[a] && (
                            <span className="text-xs text-hud-muted">{`${scores[a]} → ${after}`}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function SpellList({
    choice,
    ids,
    ctx,
    onToggle,
}: {
    choice: Choice;
    ids: string[];
    ctx: PickerContext;
    onToggle: (id: string) => void;
}) {
    const t = useTranslations('choices');

    const tg = useTranslator('gameTerms');

    const rule = choice.spells;

    if (!rule) return null;

    const max = rule.maxLevel === 'slots' ? ctx.maxSlotLevel : rule.maxLevel;

    const shown = ctx.spells.filter(
        (s) =>
            s.level >= rule.minLevel &&
            s.level <= max &&
            (rule.lists.length === 0 ||
                s.lists.some((l) => rule.lists.includes(l)))
    );

    return (
        <div className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
            {shown.map((s) => (
                <Card
                    key={s.id}
                    role="checkbox"
                    checked={ids.includes(s.id)}
                    onClick={() => onToggle(s.id)}
                    title={s.name}
                    note={tg(`spellLevels.${s.level}`)}
                />
            ))}
            {shown.length === 0 && (
                <p className="text-xs text-hud-muted">
                    {t('picker.noSpells', {
                        lists: rule.lists.join(', ') || '—',
                    })}
                </p>
            )}
        </div>
    );
}
