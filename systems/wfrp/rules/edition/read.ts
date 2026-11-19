import {
    EDITION_PRESETS,
    EDITION_PROFILES,
    type EditionPreset,
    type EditionProfile,
} from './profiles';

export const DEFAULT_EDITION: EditionPreset = 'legacy';

/** Campaigns without the item (or with an unknown value) stay on the legacy behaviour. */
export function editionOf(rules?: object | null): EditionProfile {
    const preset = (rules as { edition?: { preset?: unknown } } | null)?.edition
        ?.preset;

    return EDITION_PROFILES[
        (EDITION_PRESETS as readonly unknown[]).includes(preset)
            ? (preset as EditionPreset)
            : DEFAULT_EDITION
    ];
}
