const TEMPLATE_HIDDEN_DM_PATHS = new Set(["characters", "battles", "scenario"]);

export const isDmLinkVisible = (path: string, isTemplate: boolean) => !(isTemplate && TEMPLATE_HIDDEN_DM_PATHS.has(path));
