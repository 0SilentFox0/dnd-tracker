'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPinned, MessagesSquare, NotebookPen, PenLine } from 'lucide-react';

import { markerIcon } from '../marker-icon-options';
import { DmMarkerNotes } from '../panels/DmMarkerNotes';
import {
    CHIP,
    CloseButton,
    DeleteButton,
    NameInput,
    POPOVER,
    StripLead,
    SwitchField,
} from '../panels/InspectorParts';
import { useEditorMarkerFields } from '../use-editor-fields';
import { MarkerIconGrid } from './MapFieldParts';
import { NewWorldMapDialog } from './NewWorldMapDialog';

import { ColorSwatch } from '@/components/common/fields/ColorSwatch';
import { HudButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { WORLD_DM_NOTE_MAX } from '@/lib/constants/world';
import { cn } from '@/lib/utils';
import type { WorldMarker } from '@/types/world';

export function MarkerStrip({
    marker,
    onClose,
}: {
    marker: WorldMarker;
    onClose(): void;
}) {
    const t = useTranslations('world');

    const tc = useTranslations('common.actions');

    const [creating, setCreating] = useState(false);

    const [iconOpen, setIconOpen] = useState(false);

    const m = useEditorMarkerFields(marker);

    const Icon = markerIcon(marker);

    return (
        <>
            <StripLead
                icon={Icon}
                label={t(`shape.${marker.kind}`)}
                labelClassName="hidden xl:inline"
            />
            <NameInput
                value={m.name}
                onChange={m.setName}
                onCommit={m.commitName}
            />
            {marker.kind === 'point' ? (
                <Popover open={iconOpen} onOpenChange={setIconOpen}>
                    <PopoverTrigger asChild>
                        <HudButton
                            type="button"
                            aria-label={t('editor.icon')}
                            title={t('editor.icon')}
                            className={CHIP}
                        >
                            <Icon className="size-4" aria-hidden />
                            {t('editor.icon')}
                        </HudButton>
                    </PopoverTrigger>
                    <PopoverContent className={POPOVER}>
                        <MarkerIconGrid
                            aria-label={t('editor.icons')}
                            value={marker.icon}
                            cellClassName="size-10"
                            onPick={(icon) => {
                                void m.save({ icon });
                                setIconOpen(false);
                            }}
                        />
                    </PopoverContent>
                </Popover>
            ) : (
                <>
                    <ColorSwatch
                        color={m.color}
                        label={t('editor.zoneColor')}
                        onChange={m.pickColor}
                    />
                    <Button
                        type="button"
                        size="sm"
                        variant={m.redrawing ? 'default' : 'outline'}
                        onClick={() => m.redraw(m.redrawing ? null : marker.id)}
                        className="h-9 shrink-0 gap-1.5"
                        aria-label={
                            m.redrawing
                                ? t('editor.drawNewZone')
                                : t('editor.redrawOutline')
                        }
                    >
                        <PenLine className="size-4" />
                        {m.redrawing
                            ? t('editor.drawing')
                            : t('editor.outline')}
                    </Button>
                </>
            )}
            <SwitchField
                label={t('editor.knownLocation')}
                title={t('editor.knownLocationHint')}
                checked={marker.alwaysVisible}
                onChange={(v) => void m.save({ alwaysVisible: v })}
            />
            <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                    marker.childMapId
                        ? m.openMap(marker.childMapId)
                        : setCreating(true)
                }
                className="h-9 shrink-0 gap-1.5"
                aria-label={
                    marker.childMapId
                        ? t('editor.openChild')
                        : t('editor.createChild')
                }
            >
                <MapPinned className="size-4" />
                {marker.childMapId
                    ? t('editor.childMap')
                    : t('editor.createMap')}
            </Button>
            <Popover onOpenChange={(o) => !o && m.commitNote()}>
                <PopoverTrigger asChild>
                    <HudButton type="button" className={CHIP}>
                        <NotebookPen className="size-4" aria-hidden />
                        {t('editor.note')}
                        {m.note.trim() ? (
                            <span
                                aria-hidden
                                className="size-1.5 rounded-full bg-[var(--gold)]"
                            />
                        ) : null}
                    </HudButton>
                </PopoverTrigger>
                <PopoverContent className={cn(POPOVER, 'w-72')}>
                    <Textarea
                        aria-label={t('editor.dmNote')}
                        rows={5}
                        value={m.note}
                        maxLength={WORLD_DM_NOTE_MAX}
                        onChange={(e) => m.setNote(e.target.value)}
                        onBlur={m.commitNote}
                    />
                </PopoverContent>
            </Popover>
            <Popover>
                <PopoverTrigger asChild>
                    <HudButton type="button" className={CHIP}>
                        <MessagesSquare className="size-4" aria-hidden />
                        {t('editor.playerNotes')}
                    </HudButton>
                </PopoverTrigger>
                <PopoverContent
                    className={cn(POPOVER, 'max-h-96 w-80 overflow-y-auto')}
                >
                    <DmMarkerNotes marker={marker} />
                </PopoverContent>
            </Popover>
            <span className="ml-auto flex shrink-0 items-center gap-2">
                <DeleteButton
                    label={tc('delete')}
                    onClick={() => void m.remove()}
                />
                <CloseButton onClose={onClose} />
            </span>
            <NewWorldMapDialog
                open={creating}
                onOpenChange={setCreating}
                parentMarker={{ id: marker.id, name: marker.name }}
            />
        </>
    );
}
