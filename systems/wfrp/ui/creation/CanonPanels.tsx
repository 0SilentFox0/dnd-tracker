'use client';

import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';

import { OptionCard } from './OptionCard';
import type { WfrpDraftFormState } from './types';

import { Button } from '@/components/ui/button';
import { SwitchField } from '@/components/ui/switch-field';
import { SKILL_PURCHASE_CAP } from '@/systems/wfrp/rules/creation';
import { skillLabel } from '@/systems/wfrp/ui/skill-label';

type Canon = NonNullable<WfrpDraftFormState['canon']>;

const labelOf = (tg: Parameters<typeof skillLabel>[0], key: string) => {
    const [base, spec] = key.split(':');

    return skillLabel(tg, base, spec);
};

function Stepper({
    value,
    onChange,
    min,
    max,
    label,
}: {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    label: string;
}) {
    const t = useTranslations('wfrpCreation.canon');

    return (
        <span className="flex items-center gap-1">
            <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-11"
                aria-label={`${t('dec')}: ${label}`}
                disabled={value <= min}
                onClick={() => onChange(value - 1)}
            >
                <Minus aria-hidden />
            </Button>
            <b className="w-6 text-center tabular-nums">{value}</b>
            <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-11"
                aria-label={`${t('inc')}: ${label}`}
                disabled={value >= max}
                onClick={() => onChange(value + 1)}
            >
                <Plus aria-hidden />
            </Button>
        </span>
    );
}

export function SpeciesCanonPanel({ canon }: { canon: Canon }) {
    const t = useTranslations('wfrpCreation.canon');

    const tg = useTranslations('gameTerms');

    const { speciesSkills: s } = canon;

    return (
        <div className="mt-4 space-y-3">
            <SwitchField
                id="wfrp-species-rolled"
                className="min-h-11"
                label={t('speciesRolled')}
                checked={canon.speciesRolled}
                onCheckedChange={canon.setSpeciesRolled}
            />
            {s.count > 0 && (
                <section className="space-y-2">
                    <h3 className="text-sm font-semibold">
                        {t('speciesSkills', {
                            picked: s.picked.length,
                            count: s.count,
                            points: canon.step,
                        })}
                    </h3>
                    <div className="grid gap-2" role="group">
                        {s.options.map((key) => (
                            <OptionCard
                                key={key}
                                selected={s.picked.includes(key)}
                                onSelect={() => s.toggle(key, s.count)}
                            >
                                {labelOf(tg, key)}
                            </OptionCard>
                        ))}
                    </div>
                </section>
            )}
            {canon.speciesTalents.groups.map((group, i) => (
                <section key={group.join('|')} className="space-y-2">
                    <h3 className="text-sm font-semibold">
                        {t('speciesTalents', {
                            n: i + 1,
                            total: canon.speciesTalents.groups.length,
                        })}
                    </h3>
                    <div className="grid gap-2" role="group">
                        {group.map((featId) => (
                            <OptionCard
                                key={featId}
                                selected={
                                    canon.speciesTalents.picked[i] === featId
                                }
                                onSelect={() =>
                                    canon.speciesTalents.set(i, featId)
                                }
                            >
                                {canon.speciesTalents.names(featId)}
                            </OptionCard>
                        ))}
                    </div>
                </section>
            ))}
            {s.languages.length > 0 && (
                <p className="text-sm text-hud-muted">
                    {t('languages', {
                        names: s.languages
                            .map((k) => labelOf(tg, k))
                            .join(', '),
                    })}
                </p>
            )}
        </div>
    );
}

export function CareerCanonPanel({ canon }: { canon: Canon }) {
    const t = useTranslations('wfrpCreation.canon');

    const tg = useTranslations('gameTerms');

    const { careerSkills: c } = canon;

    if (!c.options.length) return null;

    const spent = Object.values(c.counts).reduce((a, b) => a + b, 0);

    const taken = (key: string) =>
        canon.speciesSkills.picked.filter((k) => k === key).length;

    return (
        <section className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">
                {t('careerSkills', {
                    spent,
                    total: 8,
                    points: canon.step,
                })}
            </h3>
            <ul className="grid gap-2">
                {c.options.map((key) => (
                    <li
                        key={key}
                        className="flex min-h-11 items-center gap-2 rounded-lg border border-hud-line px-3 py-1 text-sm"
                    >
                        <span className="min-w-0 flex-1">
                            {labelOf(tg, key)}
                        </span>
                        <Stepper
                            label={labelOf(tg, key)}
                            value={c.counts[key] ?? 0}
                            min={0}
                            max={
                                spent >= 8
                                    ? (c.counts[key] ?? 0)
                                    : SKILL_PURCHASE_CAP - taken(key)
                            }
                            onChange={(v) => c.set(key, v)}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}

export function StatsCanonPanel({
    canon,
    label,
}: {
    canon: Canon;
    label: (key: string) => string;
}) {
    const t = useTranslations('wfrpCreation.canon');

    const { distribution: d } = canon;

    const spent = Object.values(d.values).reduce((a, b) => a + (b ?? 0), 0);

    return (
        <div className="space-y-2">
            {canon.fateBonus && (
                <p role="status" className="text-sm font-semibold">
                    {t('fateBonus')}
                </p>
            )}
            {d.cap > 0 && d.keys.length > 0 && (
                <section className="space-y-2">
                    <h3 className="text-sm font-semibold">
                        {t('distribution', { spent, cap: d.cap })}
                    </h3>
                    <ul className="grid gap-2">
                        {d.keys.map((key) => (
                            <li
                                key={key}
                                className="flex min-h-11 items-center gap-2 rounded-lg border border-hud-line px-3 py-1 text-sm"
                            >
                                <span className="min-w-0 flex-1">
                                    {label(key)}
                                </span>
                                <Stepper
                                    label={label(key)}
                                    value={d.values[key] ?? 0}
                                    min={0}
                                    max={(d.values[key] ?? 0) + (d.cap - spent)}
                                    onChange={(v) => d.set(key, v)}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

export function TalentsCanonPanel({
    canon,
    names,
}: {
    canon: Canon;
    names: (id: string) => string;
}) {
    const t = useTranslations('wfrpCreation.canon');

    const { careerTalent: c } = canon;

    return (
        <div className="space-y-4">
            {c.options.length > 0 && (
                <section className="space-y-2">
                    <h3 className="text-sm font-semibold">
                        {t('careerTalent')}
                    </h3>
                    <div role="radiogroup" className="grid gap-2">
                        {c.options.map((id) => (
                            <OptionCard
                                key={id}
                                selected={c.picked === id}
                                onSelect={() => c.set(id)}
                            >
                                {names(id)}
                            </OptionCard>
                        ))}
                    </div>
                </section>
            )}
            {canon.trappings.length > 0 && (
                <section className="space-y-2">
                    <h3 className="text-sm font-semibold">{t('trappings')}</h3>
                    <ul className="list-disc pl-5 text-sm text-hud-muted">
                        {canon.trappings.map((name) => (
                            <li key={name}>{name}</li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
