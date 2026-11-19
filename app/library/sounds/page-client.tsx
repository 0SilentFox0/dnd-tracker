'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { LoadingState } from '@/components/common/states';
import { HudPage, HudPageHeader, HudPanel } from '@/components/hud/page';
import { AddSoundMenu } from '@/components/soundboard/library/AddSoundMenu';
import { PresetEditor } from '@/components/soundboard/library/PresetEditor';
import { PresetList } from '@/components/soundboard/library/PresetList';
import { SoundEditDialog } from '@/components/soundboard/library/SoundEditDialog';
import { SoundTile } from '@/components/soundboard/library/SoundTile';
import { useSoundLibrary, useSoundPreview } from '@/lib/hooks/soundboard';
import type { LibrarySound } from '@/types/soundboard';

export function SoundLibraryPageClient() {
    const t = useTranslations('soundboard');

    const { sounds, presets, isLoading } = useSoundLibrary();

    const preview = useSoundPreview();

    const [editing, setEditing] = useState<LibrarySound | null>(null);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selected = presets.find((p) => p.id === selectedId) ?? presets[0];

    return (
        <HudPage width="md">
            <HudPageHeader
                title={t('library.title')}
                subtitle={t('library.subtitle')}
            />
            {isLoading ? (
                <LoadingState />
            ) : (
                <>
                    <HudPanel>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h2 className="hud-sc text-sm text-hud-ink">
                                {t('library.sounds')}
                            </h2>
                            <AddSoundMenu />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {sounds.map((sound) => (
                                <SoundTile
                                    key={sound.id}
                                    sound={sound}
                                    actions={{
                                        onPreview: preview,
                                        onEdit: setEditing,
                                    }}
                                />
                            ))}
                        </div>
                    </HudPanel>
                    <HudPanel>
                        <h2 className="hud-sc mb-2 text-sm text-hud-ink">
                            {t('library.presets')}
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <PresetList
                                presets={presets}
                                selectedId={selected?.id ?? null}
                                onSelect={setSelectedId}
                            />
                            {selected && (
                                <PresetEditor
                                    key={selected.id}
                                    preset={selected}
                                />
                            )}
                        </div>
                    </HudPanel>
                </>
            )}
            <SoundEditDialog
                sound={editing}
                presets={presets}
                onClose={() => setEditing(null)}
            />
        </HudPage>
    );
}
