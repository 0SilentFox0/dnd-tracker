'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { HudToggleChip } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { STAMP_BIOMES } from '@/lib/constants/map-art/stamps';
import { ALL_CATEGORIES, useStampPalette } from '@/lib/hooks/battle-maps';

const THUMB_PX = 64;

export function StampPalette({
    selected,
    onSelect,
}: {
    selected: string | null;
    onSelect: (id: string) => void;
}) {
    const t = useTranslations('maps.editor.stamps');

    const names = useTranslations();

    const palette = useStampPalette((key) => names(key as never));

    const categories = [
        { value: ALL_CATEGORIES, label: t('categoryAll') },
        ...palette.categories.map((c) => ({
            value: c,
            label: names(`mapStamps.category.${c}` as never),
        })),
    ];

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5" role="group">
                {STAMP_BIOMES.map((b) => (
                    <HudToggleChip
                        key={b}
                        active={palette.biome === b}
                        onClick={() => palette.setBiome(b)}
                    >
                        {t(`biome.${b}`)}
                    </HudToggleChip>
                ))}
            </div>
            <SelectField
                aria-label={t('categoryLabel')}
                value={palette.category}
                options={categories}
                onValueChange={palette.setCategory}
                triggerClassName="h-8 w-full"
            />
            <SearchInput
                label={t('search')}
                placeholder={t('search')}
                value={palette.query}
                onChange={palette.setQuery}
            />
            <div className="grid grid-cols-3 gap-1">
                {palette.items.map((def) => {
                    const name = names(def.nameKey as never);

                    return (
                        <Button
                            key={def.id}
                            type="button"
                            size="sm"
                            aria-pressed={selected === def.id}
                            aria-label={name}
                            title={name}
                            className="h-auto min-w-0 flex-col gap-1 px-1 py-1.5 text-center whitespace-normal"
                            variant={selected === def.id ? 'default' : 'outline'}
                            onClick={() => onSelect(def.id)}
                        >
                            <span className="flex h-12 w-full items-center justify-center overflow-hidden rounded bg-black/30 p-1">
                                <Image
                                    src={def.file}
                                    alt=""
                                    width={THUMB_PX}
                                    height={THUMB_PX}
                                    unoptimized
                                    loading="lazy"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </span>
                            <span className="line-clamp-2 w-full text-[11px] leading-tight">
                                {name}
                            </span>
                        </Button>
                    );
                })}
            </div>
            {palette.items.length === 0 && (
                <p className="rounded-md border border-dashed border-hud-rule p-3 text-center text-xs text-hud-muted">
                    {t('empty')}
                </p>
            )}
        </div>
    );
}
