export const ARTIFACT_FORM_TAB = { basic: "basic", weapon: "weapon", armor: "armor", abilities: "abilities" } as const;

export type ArtifactFormTabId = (typeof ARTIFACT_FORM_TAB)[keyof typeof ARTIFACT_FORM_TAB];
