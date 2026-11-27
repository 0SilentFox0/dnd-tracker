export function formatTrackDuration(sec: number | null | undefined) {
    return sec
        ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
        : null;
}
