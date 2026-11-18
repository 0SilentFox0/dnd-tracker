'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { HUD_SELECT_CLASS } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArtifactSlot } from '@/lib/constants/artifacts';
import { useArtifactsList } from '@/lib/hooks/artifacts';
import { ARMOR_CATEGORIES } from '@/lib/utils/artifacts/armor-stats';
import { toggleItem } from '@/lib/utils/common/collections';
import { patchDefined } from '@/lib/utils/common/patch-defined';
import {
    composedName,
    type ItemRowLike,
    matchesAppliesTo,
} from '@/lib/utils/items/compose';
import { itemStatsRecords } from '@/lib/utils/items/item-row';
import type { ItemKind, ItemStats } from '@/lib/utils/items/item-stats';

type Property = NonNullable<ItemStats['property']>;

type AppliesTo = Property['appliesTo'];

const KIND_VALUES: ItemKind[] = ['weapon', 'armor', 'shield'];

function ChipRow({
    options,
    selected,
    onToggle,
}: {
    options: Array<{ value: string; label: string }>;
    selected: readonly string[] | undefined;
    onToggle: (v: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1">
            {options.map((o) => {
                const on = !!selected?.includes(o.value);

                return (
                    <Button
                        key={o.value}
                        type="button"
                        size="sm"
                        variant={on ? 'default' : 'outline'}
                        aria-pressed={on}
                        onClick={() => onToggle(o.value)}
                    >
                        {o.label}
                    </Button>
                );
            })}
        </div>
    );
}

export function PropertyFields({
    campaignId,
    name,
    property,
    onChange,
}: {
    campaignId: string;
    name: string;
    property: Property;
    onChange: (next: Property) => void;
}) {
    const t = useTranslations('artifacts.item');

    const tArmor = useTranslations('artifacts.armor');

    const kinds = KIND_VALUES.map((value) => ({
        value,
        label: t(`kinds.${value}`),
    }));

    const categories = ARMOR_CATEGORIES.map((value) => ({
        value,
        label: tArmor(`categories.${value}`),
    }));

    const artifacts = useArtifactsList(campaignId).data;

    const applies = property.appliesTo;

    const { candidates, first } = useMemo(() => {
        const library = (artifacts ?? []) as ItemRowLike[];

        const probe = (appliesTo: AppliesTo): ItemRowLike => ({
            id: 'probe',
            name,
            slot: ArtifactSlot.WEAPON,
            modifiers: itemStatsRecords({
                property: { ...property, appliesTo },
            }),
        });

        const withoutBases: AppliesTo = { ...applies, bases: undefined };

        return {
            candidates: library.filter((a) =>
                matchesAppliesTo(a, probe(withoutBases))
            ),
            first: library.find((a) => matchesAppliesTo(a, probe(applies))),
        };
    }, [artifacts, property, applies, name]);

    const setApplies = (patch: Partial<AppliesTo>) => {
        const next = patchDefined(
            applies,
            patch,
            (v) => v === undefined || (Array.isArray(v) && v.length === 0)
        );

        if (next.kinds.length === 0) next.kinds = applies.kinds;

        onChange({ ...property, appliesTo: next });
    };

    return (
        <div className="space-y-3 rounded-md border border-hud-line p-3">
            <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                    {t('appliesTo')}
                </span>
                <ChipRow
                    options={kinds}
                    selected={applies.kinds}
                    onToggle={(v) =>
                        setApplies({
                            kinds: toggleItem(applies.kinds, v as ItemKind),
                        })
                    }
                />
            </div>
            {applies.kinds.includes('weapon') && (
                <div className="space-y-1">
                    <Label
                        htmlFor="item-attack-type"
                        className="text-xs text-muted-foreground"
                    >
                        {t('attackType')}
                    </Label>
                    <select
                        id="item-attack-type"
                        className={`${HUD_SELECT_CLASS} w-full`}
                        value={applies.attackType ?? ''}
                        onChange={(e) =>
                            setApplies({
                                attackType: (e.target.value ||
                                    undefined) as AppliesTo['attackType'],
                            })
                        }
                    >
                        <option value="">{t('attackAny')}</option>
                        <option value="melee">{t('attackMelee')}</option>
                        <option value="ranged">{t('attackRanged')}</option>
                    </select>
                </div>
            )}
            {applies.kinds.includes('armor') && (
                <ChipRow
                    options={categories}
                    selected={applies.armorCategories}
                    onToggle={(v) =>
                        setApplies({
                            armorCategories: toggleItem(
                                applies.armorCategories,
                                v as (typeof ARMOR_CATEGORIES)[number]
                            ),
                        })
                    }
                />
            )}
            <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                    {t('bases')}
                </span>
                <ChipRow
                    options={candidates.map((a) => ({
                        value: a.name,
                        label: a.name,
                    }))}
                    selected={applies.bases}
                    onToggle={(v) =>
                        setApplies({ bases: toggleItem(applies.bases, v) })
                    }
                />
            </div>
            <div className="space-y-1">
                <Label
                    htmlFor="item-name-template"
                    className="text-xs text-muted-foreground"
                >
                    {t('nameTemplate', { token: '{base}' })}
                </Label>
                <Input
                    id="item-name-template"
                    maxLength={100}
                    placeholder="{name} ({base})"
                    value={property.nameTemplate ?? ''}
                    onChange={(e) =>
                        onChange({
                            ...property,
                            nameTemplate: e.target.value.trim()
                                ? e.target.value
                                : undefined,
                        })
                    }
                />
                {first && (
                    <p className="text-xs text-hud-muted">
                        {t('preview', {
                            name: composedName(
                                first,
                                { name },
                                property.nameTemplate
                            ),
                        })}
                    </p>
                )}
            </div>
        </div>
    );
}
