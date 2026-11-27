'use client';

import { useTranslations } from 'next-intl';
import { Grid3x3, ImageUp, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';

export type MapQuickStartAction = 'image' | 'uvtt' | 'grid';

const ACTIONS = [
    { key: 'image', icon: ImageUp },
    { key: 'uvtt', icon: Upload },
    { key: 'grid', icon: Grid3x3 },
] as const;

export function MapQuickStart({
    onPick,
}: {
    onPick: (action: MapQuickStartAction) => void;
}) {
    const t = useTranslations('battleSetup.map.quickStart');

    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
            <div className="ds-panel pointer-events-auto w-full max-w-md space-y-3 rounded-xl p-4">
                <h3 className="hud-sc text-lg text-hud-ink">{t('title')}</h3>
                <div className="grid gap-2">
                    {ACTIONS.map(({ key, icon: Icon }) => (
                        <Button
                            key={key}
                            type="button"
                            variant="outline"
                            className="h-auto justify-start gap-3 py-2 text-left whitespace-normal"
                            onClick={() => onPick(key)}
                        >
                            <Icon
                                aria-hidden="true"
                                className="h-5 w-5 shrink-0"
                            />
                            <span className="min-w-0">{t(key)}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
