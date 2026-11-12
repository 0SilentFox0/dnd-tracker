export const CONTENT_KINDS = [
    'units',
    'races',
    'classes',
    'feats',
    'backgrounds',
    'careers',
    'spells',
    'spell-groups',
    'main-skills',
    'skills',
    'artifacts',
    'artifact-sets',
    'tracks',
] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CORE_CONTENT_KINDS = [
    'units',
    'races',
    'feats',
    'spells',
    'spell-groups',
    'artifacts',
    'tracks',
] as const satisfies readonly ContentKind[];
