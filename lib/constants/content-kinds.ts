export const CONTENT_KINDS = ["units", "races", "classes", "feats", "backgrounds", "careers", "spells", "spell-groups", "main-skills", "skills", "artifacts", "artifact-sets", "tracks"] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];
