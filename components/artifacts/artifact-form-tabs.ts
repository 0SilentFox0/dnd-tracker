export const ARTIFACT_FORM_TAB = { basic: "basic", weapon: "weapon", armor: "armor", item: "item", stats: "stats", abilities: "abilities" } as const;

export type ArtifactFormTabId = (typeof ARTIFACT_FORM_TAB)[keyof typeof ARTIFACT_FORM_TAB];
