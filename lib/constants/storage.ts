export const YEAR_CACHE_SECONDS = "31536000";

/** Images shipped in /public that rich content may reference without being uploaded to project Storage. */
export const BUNDLED_STATIC_ASSET = /^\/(?:battle-maps|example-demo\/maps)\/[\w.-]+\.(?:svg|webp|jpe?g|png)$/;

export const ICON_BUCKETS = ["unit-icons", "spell-icons", "artifact-icons", "class-icons", "race-icons", "skill-icons", "main-skill-icons"] as const;

/** Object-path prefix of template icons shared between campaigns: immutable, hash-addressed, never deleted. */
export const SHARED_ASSET_PREFIX = "sets/";
