'use client';

import { useTranslations } from 'next-intl';

import { SwitchField } from '@/components/ui/switch-field';
import { Button } from '@/components/ui/button';
import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Label } from '@/components/ui/label';
import { type EditorStamps, STAMP_SCALE } from '@/lib/hooks/battle-maps';
import type { MapArtStamp } from '@/types/battle-map';

export function StampControls({
    api,
    selected,
}: {
    api: EditorStamps;
    selected: MapArtStamp | undefined;
}) {
    const t = useTranslations('maps.editor.stamps');

    return (
        <div className="space-y-3">
            <SwitchField
                id="stamp-snap"
                label={t('snap')}
                checked={api.snap}
                onCheckedChange={api.setSnap}
            />
            <SwitchField
                id="stamp-show-blocking"
                label={t('showBlocking')}
                checked={api.showAllBlocking}
                onCheckedChange={api.setShowAllBlocking}
            />
            {selected && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label htmlFor="stamp-rot" className="text-xs">
                                {t('rotate')}
                            </Label>
                            <BoundedNumberInput
                                id="stamp-rot"
                                value={Math.round(selected.rot)}
                                min={0}
                                max={359}
                                onCommit={(rot) => api.update(selected.id, { rot })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="stamp-scale" className="text-xs">
                                {t('scale')}
                            </Label>
                            <BoundedNumberInput
                                id="stamp-scale"
                                decimal
                                value={Math.round(selected.scale * 100) / 100}
                                min={STAMP_SCALE.min}
                                max={STAMP_SCALE.max}
                                onCommit={(scale) => api.update(selected.id, { scale })}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-pressed={selected.flip}
                            onClick={() => api.update(selected.id, { flip: !selected.flip })}
                        >
                            {t('flip')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => api.reorder(selected.id, 1)}
                        >
                            {t('forward')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => api.reorder(selected.id, -1)}
                        >
                            {t('backward')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => api.duplicate(selected.id)}
                        >
                            {t('duplicate')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => api.remove(selected.id)}
                        >
                            {t('delete')}
                        </Button>
                    </div>
                </div>
            )}
            <p className="text-xs text-hud-muted">{t('hints')}</p>
        </div>
    );
}
