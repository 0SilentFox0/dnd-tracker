import { randomInt } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const INVITE_CODE_LENGTH = 6;

export function generateInviteCode(): string {
  return Array.from({ length: INVITE_CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
