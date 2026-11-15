export type FxBadgeKey =
    | 'thorns'
    | 'rust'
    | 'raincloud'
    | 'might'
    | 'siphon'
    | 'stoneskin';

/** The numbers drawn on the badges; the translated text takes them as `{value}`. */
export const FX_BADGE_VALUES = {
    thorns: 3,
    rust: 2,
    raincloud: 2,
    siphon: 25,
} as const;
