'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crosshair, ImagePlus, Move, Trash2 } from 'lucide-react';

import { FieldRow, FieldSection } from '../FieldRow';
import { ICON_OPTIONS } from '../marker-icon-options';
import { MarkerColorField } from '../MarkerColorField';
import { LayerDeleteDialog } from './LayerDeleteDialog';
import { LayerHeroPicker } from './LayerHeroPicker';

import { HudButton, HudIconButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { FileButton } from '@/components/ui/file-button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { Slider } from '@/components/ui/slider';
import { LAYER_ZONE_LABELS, WORLD_NAME_MAX } from '@/lib/constants/world';
import { useConfirm } from '@/lib/hooks/common';
import { useLayerForm, type useWorldEditor } from '@/lib/hooks/world';
import type { RosterHero } from '@/types/characters';
import type {
    DeleteWorldLayerMode,
    LayerVisibility,
    LayerZoneLabels,
    WorldLayer,
} from '@/types/world';

const VISIBILITIES: LayerVisibility[] = ['dm', 'all', 'heroes'];

const OPACITY_STEP = 0.05;

interface LayerRowProps {
    campaignId: string;
    layer: WorldLayer;
    ops: ReturnType<typeof useWorldEditor>['layers'];
    heroes: Pick<RosterHero, 'id' | 'name'>[];
    markerCount: number;
    mapAspect: number;
    state: {
        active: boolean;
        onActivate(): void;
        editingImage: boolean;
        onToggleImageEdit(): void;
    };
}

export function LayerRow({
    campaignId,
    layer,
    ops,
    heroes,
    markerCount,
    mapAspect,
    state,
}: LayerRowProps) {
    const t = useTranslations('world.layers');

    const tc = useTranslations('common.actions');

    const tm = useTranslations('world');

    const confirm = useConfirm();

    const [deleting, setDeleting] = useState(false);

    const f = useLayerForm({ campaignId, layer, layers: ops, mapAspect });

    const remove = (mode?: DeleteWorldLayerMode) =>
        ops.remove.mutateOk({ id: layer.id, mode });

    const askDelete = async () => {
        if (markerCount > 0) {
            setDeleting(true);

            return;
        }

        const ok = await confirm({
            title: t('deleteTitle', { name: layer.name }),
            description: t('deleteEmptyDescription'),
            confirmLabel: tc('delete'),
            destructive: true,
        });

        if (ok) void remove();
    };

    const choose = (mode: DeleteWorldLayerMode | null) => {
        setDeleting(false);

        if (mode) void remove(mode);
    };

    return (
        <li
            data-testid={`layer-row-${layer.id}`}
            data-active={state.active}
            className="space-y-3 rounded-md border border-hud-rule p-2"
        >
            <div className="flex items-center gap-2">
                <Input
                    aria-label={t('name')}
                    maxLength={WORLD_NAME_MAX}
                    value={f.name}
                    onChange={(e) => f.setName(e.target.value)}
                    onBlur={f.commitName}
                    onKeyDown={(e) =>
                        e.key === 'Enter' && e.currentTarget.blur()
                    }
                />
                <HudIconButton
                    aria-label={t('delete')}
                    title={t('delete')}
                    onClick={() => void askDelete()}
                >
                    <Trash2 className="size-4" aria-hidden />
                </HudIconButton>
            </div>
            <HudButton
                type="button"
                aria-pressed={state.active}
                onClick={state.onActivate}
                className="flex w-fit max-w-full items-center gap-1.5 text-xs"
            >
                <Crosshair className="size-3.5" aria-hidden />
                {state.active ? t('deactivate') : t('activate')}
            </HudButton>
            <FieldSection title={t('sections.appearance')}>
                <FieldRow label={t('color')}>
                    <MarkerColorField
                        label={t('color')}
                        color={f.colorValue}
                        isCustom={f.isCustomColor}
                        onPick={f.pickColor}
                        onReset={f.resetColor}
                    />
                </FieldRow>
                <FieldRow label={t('icon')}>
                    <SelectField
                        aria-label={t('icon')}
                        value={layer.icon ?? ''}
                        onValueChange={(v) => void f.setIcon(v || null)}
                        allowNone
                        noneLabel={t('iconNone')}
                        options={ICON_OPTIONS.map(({ value }) => ({
                            value,
                            label: tm(`markerKinds.${value}`),
                        }))}
                    />
                </FieldRow>
                <FieldRow label={t('zoneOpacity')}>
                    <Slider
                        aria-label={t('zoneOpacity')}
                        className="min-w-0 flex-1"
                        value={f.zoneOpacity.value}
                        min={f.zoneOpacity.min}
                        max={1}
                        step={OPACITY_STEP}
                        onValueChange={f.zoneOpacity.change}
                    />
                    {f.zoneOpacity.isCustom ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="shrink-0"
                            onClick={f.zoneOpacity.reset}
                        >
                            {t('zoneOpacityReset')}
                        </Button>
                    ) : null}
                </FieldRow>
                <FieldRow label={t('zoneLabels.label')}>
                    <SelectField
                        aria-label={t('zoneLabels.label')}
                        value={layer.zoneLabels}
                        onValueChange={(v) =>
                            void f.setZoneLabels(v as LayerZoneLabels)
                        }
                        options={LAYER_ZONE_LABELS.map((v) => ({
                            value: v,
                            label: t(`zoneLabels.${v}`),
                        }))}
                    />
                </FieldRow>
            </FieldSection>
            <FieldSection title={t('sections.access')}>
                <FieldRow label={t('visibility.label')}>
                    <SelectField
                        aria-label={t('visibility.label')}
                        value={layer.visibility}
                        onValueChange={(v) =>
                            void f.setVisibility(v as LayerVisibility)
                        }
                        options={VISIBILITIES.map((v) => ({
                            value: v,
                            label: t(`visibility.${v}`),
                        }))}
                    />
                </FieldRow>
                {layer.visibility === 'heroes' ? (
                    <LayerHeroPicker
                        heroes={heroes}
                        selected={f.heroIds}
                        onToggle={(id, on) => void f.toggleHero(id, on)}
                    />
                ) : null}
            </FieldSection>
            <FieldSection title={t('sections.image')}>
                <div className="flex flex-wrap items-center gap-2">
                    <FileButton
                        size="sm"
                        variant="outline"
                        accept="image/*"
                        inputLabel={t('image.upload')}
                        disabled={f.uploading}
                        onFile={(file) => void f.uploadImage(file)}
                    >
                        <ImagePlus className="size-3.5" aria-hidden />
                        {f.uploading
                            ? t('image.uploading')
                            : layer.imageUrl
                              ? t('image.replace')
                              : t('image.upload')}
                    </FileButton>
                    {layer.imageUrl ? (
                        <>
                            <Button
                                size="sm"
                                variant={
                                    state.editingImage ? 'default' : 'outline'
                                }
                                aria-pressed={state.editingImage}
                                onClick={state.onToggleImageEdit}
                            >
                                <Move className="size-3.5" aria-hidden />
                                {state.editingImage
                                    ? t('image.positionDone')
                                    : t('image.position')}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void f.clearImage()}
                            >
                                {t('image.remove')}
                            </Button>
                        </>
                    ) : null}
                </div>
                {layer.imageUrl ? (
                    <FieldRow label={t('opacity')}>
                        <Slider
                            aria-label={t('opacity')}
                            className="min-w-0 flex-1"
                            value={f.opacity}
                            min={f.opacityRange.min}
                            max={f.opacityRange.max}
                            step={OPACITY_STEP}
                            onValueChange={f.changeOpacity}
                        />
                    </FieldRow>
                ) : null}
            </FieldSection>
            <LayerDeleteDialog
                open={deleting}
                name={layer.name}
                markerCount={markerCount}
                onChoose={choose}
            />
        </li>
    );
}
