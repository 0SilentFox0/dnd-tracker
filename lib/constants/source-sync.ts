export const SYNC_TABLE_SCOPES = ["spellGroups", "races", "classes", "feats", "backgrounds", "units", "spells", "mainSkills", "skills", "skillTrees", "artifactSets", "artifacts", "tracks"] as const;

export const SYNC_SCOPES = [...SYNC_TABLE_SCOPES, "rules", "settings"] as const;

export const SYNC_STATUSES = ["new", "updated", "conflict", "deletedInSource", "deletedLocally"] as const;

export const SYNC_DEFAULT_ON: ReadonlySet<string> = new Set(["new", "updated"]);

export const syncStatusKey = (status: (typeof SYNC_STATUSES)[number], fromTemplate: boolean) => (fromTemplate && status === "deletedInSource" ? "deletedInTemplate" : status);

export const syncTitleKey = (isTemplate: boolean) => (isTemplate ? "fromSource" : "fromTemplate");
