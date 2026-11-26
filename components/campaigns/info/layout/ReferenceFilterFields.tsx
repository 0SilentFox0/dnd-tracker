'use client';

import { useTranslations } from 'next-intl';

import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    ITEM_SET_KEY,
    type ItemSetKey,
} from '@/lib/utils/artifacts/item-set-key';
import type { ReferenceFilters } from '@/types/info-reference';

interface FilterSelectProps {
    name:
        | 'mainSkill'
        | 'spellLevel'
        | 'spellGroup'
        | 'spellType'
        | 'rarity'
        | 'slot'
        | ItemSetKey;
    value: string | null;
    onChange: (v: string | null) => void;
    options: { value: string; label: string }[];
}

function FilterSelect({ name, value, onChange, options }: FilterSelectProps) {
    const t = useTranslations('dashboard.reference.filters');

    const label = t(`${name}.label`);

    const allLabel = t(`${name}.all`);

    if (options.length === 0) return null;

    return (
        <div className="w-full min-w-0 space-y-1.5">
            <Label className="text-xs text-hud-muted">{label}</Label>
            <SelectField
                value={value ?? ''}
                onValueChange={(v) => onChange(v || null)}
                options={options}
                placeholder={allLabel}
                allowNone
                noneLabel={allLabel}
                noneValue="all"
                triggerClassName="w-full h-10"
            />
        </div>
    );
}

const asOptions = (values: (string | number)[]) =>
    values.map((v) => ({ value: String(v), label: String(v) }));

function SkillFilters({ filter }: { filter: ReferenceFilters['skill'] }) {
    return (
        <FilterSelect
            name="mainSkill"
            value={filter.mainSkill.value}
            onChange={filter.mainSkill.set}
            options={asOptions(filter.mainSkill.options)}
        />
    );
}

function SpellFilters({ filter }: { filter: ReferenceFilters['spell'] }) {
    const { level, group, type } = filter;

    return (
        <>
            <FilterSelect
                name="spellLevel"
                value={level.value != null ? String(level.value) : null}
                onChange={(v) => level.set(v == null ? null : Number(v))}
                options={asOptions(level.options)}
            />
            <FilterSelect
                name="spellGroup"
                value={group.value}
                onChange={group.set}
                options={asOptions(group.options)}
            />
            <FilterSelect
                name="spellType"
                value={type.value}
                onChange={type.set}
                options={type.options}
            />
        </>
    );
}

function ArtifactFilters({ filter }: { filter: ReferenceFilters['artifact'] }) {
    const t = useTranslator('artifacts');

    const { rarity, slot } = filter;

    const itemSet = filter[ITEM_SET_KEY];

    return (
        <>
            <FilterSelect
                name="rarity"
                value={rarity.value}
                onChange={rarity.set}
                options={rarity.options.map((r) => ({
                    value: r,
                    label: t(`rarity.${r}`),
                }))}
            />
            <FilterSelect
                name="slot"
                value={slot.value}
                onChange={slot.set}
                options={slot.options}
            />
            <FilterSelect
                name={ITEM_SET_KEY}
                value={itemSet.value}
                onChange={itemSet.set}
                options={asOptions(itemSet.options)}
            />
        </>
    );
}

export function ReferenceFilterFields({
    filters,
}: {
    filters: ReferenceFilters;
}) {
    const { visible } = filters;

    return (
        <div className="space-y-3">
            {visible.skills && <SkillFilters filter={filters.skill} />}
            {visible.spells && <SpellFilters filter={filters.spell} />}
            {visible.artifacts && <ArtifactFilters filter={filters.artifact} />}
        </div>
    );
}
