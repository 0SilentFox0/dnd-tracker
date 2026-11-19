'use client';

import { useCallback } from 'react';

import { previewSound } from './player';

import { readAudioPrefs } from '@/lib/hooks/audio';
import { effectiveVolume } from '@/lib/utils/soundboard/volume';
import type { LibrarySound } from '@/types/soundboard';

export function useSoundPreview(): (sound: LibrarySound) => void {
    return useCallback(
        (sound) =>
            void previewSound(sound, effectiveVolume(sound, readAudioPrefs())),
        []
    );
}
