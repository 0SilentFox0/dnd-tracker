'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { PALETTE_PREVIEW } from '@/lib/theme/palettes';
import { cn } from '@/lib/utils';
import type { PaletteId } from '@/types/theme';

export function PaletteCard({
    id,
    selected,
    disabled,
    onSelect,
}: {
    id: PaletteId;
    selected: boolean;
    disabled?: boolean;
    onSelect: (id: PaletteId) => void;
}) {
    const t = useTranslations('common.header.palette');

    const p = PALETTE_PREVIEW[id];

    return (
        <Button
            type="button"
            variant="outline"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onSelect(id)}
            className={cn(
                'h-auto flex-col items-stretch gap-2 whitespace-normal p-3',
                selected && 'border-hud-crimson'
            )}
        >
            <span
                aria-hidden
                className="flex flex-col gap-1.5 rounded-[4px] p-2"
                style={{ background: p.page }}
            >
                <span
                    className="block h-2 rounded-sm"
                    style={{ background: p.panel }}
                />
                <span
                    className="block h-4 rounded-sm"
                    style={{ background: p.inset }}
                />
                <span
                    className="block h-3 w-1/2 rounded-sm"
                    style={{ background: p.crimson }}
                />
                <span
                    className="block h-1.5 w-3/4 rounded-sm"
                    style={{ background: p.ink }}
                />
                <span
                    className="block h-1.5 w-1/2 rounded-sm"
                    style={{ background: p.muted }}
                />
            </span>
            <span className="hud-sc text-[17px]">{t(`names.${id}`)}</span>
        </Button>
    );
}
