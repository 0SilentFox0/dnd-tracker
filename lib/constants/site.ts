export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dnd-tracker-omega.vercel.app").replace(/\/$/, "");

// off until the public launch: robots.txt disallows everything and pages carry noindex
export const SITE_INDEXING = process.env.SITE_INDEXING === "1";
