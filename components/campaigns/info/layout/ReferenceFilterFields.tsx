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

type FilterName =
    | 'mainSkill'
    | 'spellLevel'
    | 'spellGroup'
    | 'spellType'
    | 'rarity'
    | 'slot'
    | ItemSetKey;

interface FilterSelectProps {
    name: FilterName;
    value: string | null;
    onChange: (v: string | null) => void;
    options: { value: string; label: string }[];
}

function FilterSelect({ name, value, onChange, options }: FilterSelectProps) {
    const t = useTranslations('dashboard.reference.filters');

    const all = t(`${name}.all`);

    if (options.length === 0) return null;

    return (
        <div className="w-full min-w-0 space-y-1.5">
            <Label className="text-xs text-hud-muted">
                {t(`${name}.label`)}
            </Label>
            <SelectField
                value={value ?? ''}
                onValueChange={(v) => onChange(v || null)}
                options={options}
                placeholder={all}
                allowNone
                noneLabel={all}
                noneValue="all"
                triggerClassName="h-10 w-full"
            />
        </div>
    );
}

const asOptions = (values: (string | number)[]) =>
    values.map((v) => ({ value: String(v), label: String(v) }));

export function ReferenceFilterFields({
    filters,
}: {
    filters: ReferenceFilters;
}) {
    const ta = useTranslator('artifacts');

    const { visible, skill, spell, artifact } = filters;

    const itemSet = artifact[ITEM_SET_KEY];

    return (
        <div className="grid grid-cols-1 gap-4">
            {visible.skills && (
                <FilterSelect
                    name="mainSkill"
                    value={skill.mainSkill.value}
                    onChange={skill.mainSkill.set}
                    options={asOptions(skill.mainSkill.options)}
                />
            )}
            {visible.spells && (
                <>
                    <FilterSelect
                        name="spellLevel"
                        value={
                            spell.level.value != null
                                ? String(spell.level.value)
                                : null
                        }
                        onChange={(v) =>
                            spell.level.set(v == null ? null : Number(v))
                        }
                        options={asOptions(spell.level.options)}
                    />
                    <FilterSelect
                        name="spellGroup"
                        value={spell.group.value}
                        onChange={spell.group.set}
                        options={asOptions(spell.group.options)}
                    />
                    <FilterSelect
                        name="spellType"
                        value={spell.type.value}
                        onChange={spell.type.set}
                        options={spell.type.options}
                    />
                </>
            )}
            {visible.artifacts && (
                <>
                    <FilterSelect
                        name="rarity"
                        value={artifact.rarity.value}
                        onChange={artifact.rarity.set}
                        options={artifact.rarity.options.map((r) => ({
                            value: r,
                            label: ta(`rarity.${r}`),
                        }))}
                    />
                    <FilterSelect
                        name="slot"
                        value={artifact.slot.value}
                        onChange={artifact.slot.set}
                        options={artifact.slot.options}
                    />
                    <FilterSelect
                        name={ITEM_SET_KEY}
                        value={itemSet.value}
                        onChange={itemSet.set}
                        options={asOptions(itemSet.options)}
                    />
                </>
            )}
        </div>
    );
}
