'use client';

import { useTranslations } from 'next-intl';

import { useTheme } from '@/components/layout/ThemeProvider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PALETTE_IDS, PALETTE_SWATCHES } from '@/lib/theme/palettes';
import type { PaletteId } from '@/types/theme';

function Swatch({ id }: { id: PaletteId }) {
    return (
        <span
            aria-hidden
            className="flex h-5 w-14 shrink-0 overflow-hidden rounded-full border border-hud-line"
        >
            {PALETTE_SWATCHES[id].map((color) => (
                <span
                    key={color}
                    className="h-full flex-1"
                    style={{ background: color }}
                />
            ))}
        </span>
    );
}

export function PaletteSwitcher() {
    const t = useTranslations('common.header.palette');

    const { palette, ready, saving, error, setPalette } = useTheme();

    return (
        <div className="relative">
            <Select
                value={palette}
                disabled={!ready || saving}
                onValueChange={(value) => void setPalette(value as PaletteId)}
            >
                <SelectTrigger
                    size="sm"
                    aria-label={t('label')}
                    title={error ? t(`errors.${error}`) : t('label')}
                    className="w-[104px] border-hud-line px-2.5"
                >
                    <SelectValue>
                        <Swatch id={palette} />
                        <span className="sr-only">{t(`names.${palette}`)}</span>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent align="end" className="min-w-0">
                    {PALETTE_IDS.map((id) => (
                        <SelectItem key={id} value={id}>
                            <Swatch id={id} />
                            <span className="sr-only">{t(`names.${id}`)}</span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && (
                <span role="status" className="sr-only">
                    {t(`errors.${error}`)}
                </span>
            )}
        </div>
    );
}
