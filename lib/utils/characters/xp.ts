import { xpForLevel } from '@/lib/constants/experience';

export function xpProgress(
    experience: number,
    level: number
): { current: number; next: number | null; ratio: number } {
    const current = Math.max(0, experience);

    const next = xpForLevel(level + 1);

    if (next === null) return { current, next: null, ratio: 1 };

    const floor = xpForLevel(level) ?? 0;

    const ratio = Math.min(
        1,
        Math.max(0, (current - floor) / Math.max(1, next - floor))
    );

    return { current, next, ratio };
}
