export type EscapeStep = 'details' | 'drawing' | 'fullscreen' | 'selection';

export function escapeStep(s: {
    details: boolean;
    drawing?: boolean;
    full: boolean;
    selection: boolean;
}): EscapeStep | null {
    if (s.details) return 'details';

    if (s.drawing) return 'drawing';

    if (s.full) return 'fullscreen';

    if (s.selection) return 'selection';

    return null;
}
