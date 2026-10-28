import { z } from "zod";

export const handoffId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
export const handoffContentKind = z.enum(["units", "races", "classes", "feats", "backgrounds", "spells", "spell-groups", "main-skills", "skills", "artifacts", "artifact-sets", "tracks"]);

/** Shared with the rendering boundary; API/upload/confirm URLs are never navigation. */
export function isAssistantHandoffHref(href: string): boolean {
  return /^(?:\/settings\/ai|\/campaigns(?:\/new)?|\/campaigns\/[A-Za-z0-9_-]{1,100}(?:#invite|\/character\/draft|\/dm\/(?:ai|compendium|music|units|races|classes|feats|backgrounds|spells|spell-groups|main-skills|skills|artifacts|artifact-sets|show(?:\/[A-Za-z0-9_-]{1,100})?)))$/.test(href);
}
