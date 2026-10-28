import { randomBytes } from "node:crypto";

export const CONTENT_ID_RE = /^c[a-z0-9]{24}$/;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function newContentId(): string {
  const bytes = randomBytes(24);

  return "c" + Array.from(bytes, (b) => ALPHABET[b % 36]).join("");
}
