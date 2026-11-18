'use client';

import { useTranslations } from 'next-intl';

import { PropertyFields } from '@/components/artifacts/ArtifactPropertyFields';
import { ItemCastingFields } from '@/components/artifacts/ItemCastingFields';
import { HUD_SELECT_CLASS, HudSection } from '@/components/hud/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SwitchField } from '@/components/ui/switch-field';
import {
    ArtifactSlot,
    ITEM_LIMITS,
    ITEM_REST_VALUES,
    PROPERTY_SLOTS,
} from '@/lib/constants/artifacts';
import { patchDefined } from '@/lib/utils/common/patch-defined';
import type { ItemKind, ItemStats } from '@/lib/utils/items/item-stats';

const [MIN_CHARGES, MAX_CHARGES] = ITEM_LIMITS.charges;

const defaultKind = (slot: string): ItemKind =>
    slot === ArtifactSlot.ARMOR
        ? 'armor'
        : slot === ArtifactSlot.SHIELD
          ? 'shield'
          : 'weapon';

interface ArtifactItemFieldsProps {
    campaignId: string;
    name: string;
    slot: string;
    value: ItemStats | null | undefined;
    onChange: (next: ItemStats | null) => void;
    itemsEnabled: boolean;
}

export function ArtifactItemFields({
    campaignId,
    name,
    slot,
    value,
    onChange,
    itemsEnabled,
}: ArtifactItemFieldsProps) {
    const t = useTranslations('artifacts.item');

    const stats: ItemStats = value ?? {};

    const set = (patch: Partial<ItemStats>) => {
        const next = patchDefined(stats, patch);

        onChange(Object.keys(next).length > 0 ? next : null);
    };

    const charges = stats.charges;

    return (
        <HudSection title={t('title')} className="space-y-3">
            <SwitchField
                id="item-gear"
                label={t('gear')}
                checked={stats.unique === false}
                onCheckedChange={(v) => set({ unique: v ? false : undefined })}
            />
            {PROPERTY_SLOTS.has(slot) && (
                <SwitchField
                    id="item-property"
                    label={t('property')}
                    checked={!!stats.property}
                    onCheckedChange={(v) =>
                        set({
                            property: v
                                ? { appliesTo: { kinds: [defaultKind(slot)] } }
                                : undefined,
                            ...(v && { consumable: undefined }),
                        })
                    }
                />
            )}
            {stats.property && (
                <PropertyFields
                    campaignId={campaignId}
                    name={name}
                    property={stats.property}
                    onChange={(property) => set({ property })}
                />
            )}
            {itemsEnabled && (
                <>
                    <ItemCastingFields
                        campaignId={campaignId}
                        value={stats}
                        onChange={set}
                    />
                    <SwitchField
                        id="item-attunement"
                        label={t('attunement')}
                        checked={!!stats.attunement}
                        onCheckedChange={(v) =>
                            set({ attunement: v || undefined })
                        }
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label
                                htmlFor="item-charges"
                                className="text-xs text-muted-foreground"
                            >
                                {t('charges')}
                            </Label>
                            <Input
                                id="item-charges"
                                type="number"
                                min={MIN_CHARGES}
                                max={MAX_CHARGES}
                                value={charges?.max ?? ''}
                                onChange={(e) => {
                                    const n =
                                        e.target.value === ''
                                            ? undefined
                                            : Math.min(
                                                  MAX_CHARGES,
                                                  Math.max(
                                                      MIN_CHARGES,
                                                      Math.trunc(
                                                          Number(e.target.value)
                                                      )
                                                  )
                                              );

                                    set({
                                        charges: n
                                            ? {
                                                  max: n,
                                                  rest: charges
                                                      ? charges.rest
                                                      : stats.consumable
                                                        ? null
                                                        : 'long',
                                              }
                                            : undefined,
                                    });
                                }}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label
                                htmlFor="item-charges-rest"
                                className="text-xs text-muted-foreground"
                            >
                                {t('recharge')}
                            </Label>
                            <select
                                id="item-charges-rest"
                                className={`${HUD_SELECT_CLASS} w-full`}
                                disabled={!charges || !!stats.consumable}
                                value={
                                    charges ? (charges.rest ?? 'none') : 'long'
                                }
                                onChange={(e) =>
                                    charges &&
                                    set({
                                        charges: {
                                            max: charges.max,
                                            rest:
                                                e.target.value === 'none'
                                                    ? null
                                                    : (e.target.value as
                                                          | 'short'
                                                          | 'long'),
                                        },
                                    })
                                }
                            >
                                {ITEM_REST_VALUES.map((value) => (
                                    <option key={value} value={value}>
                                        {t(`rest.${value}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <SwitchField
                        id="item-consumable"
                        label={t('consumable')}
                        checked={!!stats.consumable}
                        disabled={!!stats.property}
                        onCheckedChange={(v) =>
                            set({
                                consumable: v || undefined,
                                ...(v &&
                                    charges && {
                                        charges: {
                                            max: charges.max,
                                            rest: null,
                                        },
                                    }),
                            })
                        }
                    />
                </>
            )}
        </HudSection>
    );
}
