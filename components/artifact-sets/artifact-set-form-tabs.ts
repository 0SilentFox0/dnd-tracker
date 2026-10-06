export const ARTIFACT_SET_FORM_TAB = { basic: "basic", members: "members", abilities: "abilities" } as const;

export type ArtifactSetFormTabId = (typeof ARTIFACT_SET_FORM_TAB)[keyof typeof ARTIFACT_SET_FORM_TAB];
