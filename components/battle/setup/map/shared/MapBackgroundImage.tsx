'use client';

import { useTranslations } from 'next-intl';

import { RangeRow } from './RangeRow';

import { ImageUpload } from '@/components/common/fields/ImageUpload';
import { Button } from '@/components/ui/button';
import type { BattleMapEditor } from '@/lib/hooks/battles';

export function MapBackgroundImage({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map');

    const { map } = editor.state;

    const { actions } = editor;

    return (
        <div className="space-y-4">
            <RangeRow
                id="map-opacity"
                label={t('opacity', {
                    value: `${Math.round(map.opacity * 100)}%`,
                })}
                value={map.opacity}
                range={{ min: 0, max: 1, step: 0.05 }}
                onChange={actions.setOpacity}
            />
            <div className="space-y-2">
                <ImageUpload
                    value={map.background ?? ''}
                    onChange={(v) => actions.setBackground(v || null)}
                    label={t('background')}
                    maxSide={2400}
                    allowFile
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => actions.setBackground(null)}
                    disabled={map.background === null}
                >
                    {t('defaultBackground')}
                </Button>
            </div>
        </div>
    );
}
