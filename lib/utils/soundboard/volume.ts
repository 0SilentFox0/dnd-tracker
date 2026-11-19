import { clamp } from '@/lib/utils/common/clamp';

export function effectiveVolume(
    sound: { volume: number },
    prefs: { volume: number; muted: boolean }
): number {
    return prefs.muted ? 0 : clamp(sound.volume * prefs.volume, 0, 1);
}
