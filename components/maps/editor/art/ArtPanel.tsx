'use client';

import { useTranslations } from 'next-intl';

import { AmbientControls } from './AmbientControls';
import { ArtToolBar } from './ArtToolBar';
import { FloorMaterialPicker } from './FloorMaterialPicker';
import { LightControls } from './LightControls';
import { OpeningOptions } from './OpeningOptions';
import { StampControls } from './StampControls';
import { StampPalette } from './StampPalette';
import { WallMaterialPicker } from './WallMaterialPicker';

import { HudToggleChip } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FLOOR_TOOLS } from '@/lib/constants/map-art/lights';
import { BLOCKED_MATERIALS } from '@/lib/constants/map-art/materials';
import {
    isStampTool,
    useDeleteMapArt,
    type useMapArtEditor,
    type useMapArtSave,
} from '@/lib/hooks/battle-maps';
import { useConfirm } from '@/lib/hooks/common';

type Art = ReturnType<typeof useMapArtEditor>;

type ArtSave = ReturnType<typeof useMapArtSave>;

const SECTION = 'space-y-3 rounded-lg border border-hud-rule bg-black/20 p-3';

const HEADING = 'text-xs font-semibold tracking-wide text-hud-muted uppercase';

const NO_ART = {
    scene: null,
    sceneVersion: 0,
    bakedSceneVersion: null,
    bakedUrl: null,
    bakedAt: null,
};

function BlockedMaterialPicker({ materials }: { materials: Art['materials'] }) {
    const t = useTranslations('maps.editor.art');

    const options = [
        { id: null, label: t('blockedMaterials.none') },
        ...BLOCKED_MATERIALS.map(({ id }) => ({
            id,
            label: t(`blockedMaterials.${id}` as never),
        })),
    ];

    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map(({ id, label }) => (
                <HudToggleChip
                    key={label}
                    active={materials.blocked === id}
                    onClick={() => materials.set({ blocked: id })}
                >
                    {label}
                </HudToggleChip>
            ))}
        </div>
    );
}

function BakeStatus({ save }: { save: ArtSave }) {
    const t = useTranslations('maps.editor.art');

    const { needsBake, lastBake } = save;

    return (
        <div className="space-y-1 text-xs" aria-live="polite">
            {needsBake && <p className="text-hud-muted">{t('bakeStale')}</p>}
            {lastBake && (
                <p className="text-hud-muted">
                    {t('bakeDone', {
                        seconds: (lastBake.ms / 1000).toFixed(1),
                        px: lastBake.cellPx,
                    })}
                </p>
            )}
        </div>
    );
}

export function ArtPanel({
    art,
    artSave,
    ids,
}: {
    art: Art;
    artSave: ArtSave;
    ids: { campaignId: string; mapId: string };
}) {
    const t = useTranslations('maps.editor.art');

    const confirm = useConfirm();

    const detach = useDeleteMapArt(ids.campaignId, ids.mapId);

    const ts = useTranslations('maps.editor.stamps');

    const { tool, materials } = art;

    if (!art.active)
        return (
            <div className={SECTION}>
                <p className="text-xs leading-relaxed text-hud-muted">
                    {t('intro')}
                </p>
                <Button type="button" size="sm" onClick={art.start}>
                    {t('start')}
                </Button>
            </div>
        );

    const onDetach = async () => {
        const ok = await confirm({
            title: t('confirmDetach.title'),
            description: t('confirmDetach.body'),
            destructive: true,
        });

        if (!ok) return;

        await detach.mutateAsync();
        art.reset(NO_ART);
    };

    return (
        <div className="space-y-4">
            <section className={SECTION}>
                <h3 className={HEADING}>{t('tools')}</h3>
                <ArtToolBar art={art} />
            </section>
            {tool && FLOOR_TOOLS.includes(tool) && tool !== 'floor-erase' && (
                <section className={SECTION}>
                    <h3 className={HEADING}>{t('floorMaterial')}</h3>
                    <FloorMaterialPicker
                        selected={materials.floor}
                        onSelect={(floor) => materials.set({ floor })}
                    />
                </section>
            )}
            {(tool === 'wall' || tool === 'room') && (
                <section className={SECTION}>
                    <h3 className={HEADING}>{t('wallMaterialTitle')}</h3>
                    <WallMaterialPicker
                        selected={materials.wall}
                        onSelect={(wall) => materials.set({ wall })}
                    />
                </section>
            )}
            {tool === 'opening' && (
                <section className={SECTION}>
                    <OpeningOptions materials={materials} />
                </section>
            )}
            {tool === 'blocked' && (
                <section className={SECTION}>
                    <Label className="text-xs">{t('blockedMaterial')}</Label>
                    <BlockedMaterialPicker materials={materials} />
                </section>
            )}
            {tool === 'light' && (
                <section className={SECTION}>
                    <h3 className={HEADING}>{t('lights')}</h3>
                    <LightControls art={art} />
                </section>
            )}
            {isStampTool(tool) && (
                <section className={SECTION}>
                    <h3 className={HEADING}>{ts('tool')}</h3>
                    {tool === 'stamp' && (
                        <StampPalette
                            selected={art.stamps.asset}
                            onSelect={art.stamps.setAsset}
                        />
                    )}
                    <StampControls
                        api={art.stamps}
                        selected={art.scene?.stamps.find(
                            (s) => s.id === art.stamps.selectedId
                        )}
                    />
                </section>
            )}
            <section className={SECTION}>
                <h3 className={HEADING}>{t('ambient')}</h3>
                <AmbientControls art={art} />
            </section>
            <section className={SECTION}>
                <BakeStatus save={artSave} />
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        size="sm"
                        disabled={!artSave.needsBake || artSave.isSaving}
                        onClick={() => artSave.save({ bake: true })}
                    >
                        {t('bake')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={detach.isPending}
                        onClick={onDetach}
                    >
                        {t('detach')}
                    </Button>
                </div>
            </section>
        </div>
    );
}
