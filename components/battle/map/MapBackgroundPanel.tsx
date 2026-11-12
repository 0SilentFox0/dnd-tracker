'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload';
import type { MapBackgroundTool } from '@/lib/hooks/battle';

export function MapBackgroundPanel({ tool }: { tool: MapBackgroundTool }) {
    const t = useTranslations('battle.map');

    return (
        <div
            role="group"
            aria-label={t('tools.background')}
            className="flex max-w-[calc(100%-1rem)] flex-col gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs text-hud-bone"
        >
            <ImageUpload
                value={tool.current ?? ''}
                onChange={(v) => tool.choose(v || null)}
                label={t('backgroundLabel')}
                maxSide={2400}
                allowFile
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => tool.choose(null)}
                disabled={tool.pending || tool.current === null}
            >
                {t('defaultBackground')}
            </Button>
        </div>
    );
}
