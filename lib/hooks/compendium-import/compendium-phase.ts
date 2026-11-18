export type CompendiumPhase =
    | 'idle'
    | 'reading'
    | 'previewing'
    | 'confirming'
    | 'media'
    | 'opening';

export const compendiumPhaseOf = (s: {
    reading: boolean;
    previewing: boolean;
    confirming: boolean;
    media: boolean;
    opening: boolean;
}): CompendiumPhase =>
    s.reading
        ? 'reading'
        : s.previewing
          ? 'previewing'
          : s.confirming
            ? 'confirming'
            : s.media
              ? 'media'
              : s.opening
                ? 'opening'
                : 'idle';
