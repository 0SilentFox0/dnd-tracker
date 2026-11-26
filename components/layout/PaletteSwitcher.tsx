'use client';

import { useTranslations } from 'next-intl';

import { PaletteCard } from '@/components/layout/PaletteCard';
import { useTheme } from '@/components/layout/ThemeProvider';
import { PALETTE_IDS } from '@/lib/theme/palettes';

export function PaletteSwitcher() {
    const t = useTranslations('common.header.palette');

    const { palette, ready, saving, error, setPalette } = useTheme();

    return (
        <div className="space-y-2">
            <div
                role="group"
                aria-label={t('label')}
                className="grid grid-cols-2 gap-3"
            >
                {PALETTE_IDS.map((id) => (
                    <PaletteCard
                        key={id}
                        id={id}
                        selected={palette === id}
                        disabled={!ready || saving}
                        onSelect={(next) => void setPalette(next)}
                    />
                ))}
            </div>
            {error && (
                <p role="status" className="text-sm text-hud-crimson-fg">
                    {t(`errors.${error}`)}
                </p>
            )}
        </div>
    );
}
