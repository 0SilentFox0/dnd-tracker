'use client';

import { useTranslator } from '@/lib/i18n/use-translator';
import type { LibrarySound, SoundPreset } from '@/types/soundboard';

export function useSoundLabel(sound: LibrarySound): string {
    const t = useTranslator();

    return sound.name ?? (sound.nameKey ? t(sound.nameKey) : '');
}

// starter presets arrive as translation keys, user presets as plain names
export function usePresetName(): (preset: Pick<SoundPreset, 'name'>) => string {
    const t = useTranslator();

    return (preset) =>
        preset.name.startsWith('soundboard.') ? t(preset.name) : preset.name;
}
