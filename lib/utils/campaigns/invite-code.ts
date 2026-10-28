import { Prisma } from "@prisma/client";
import { randomInt } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const INVITE_CODE_LENGTH = 6;

export function generateInviteCode(): string {
  return Array.from({ length: INVITE_CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export const INVITE_CODE_ATTEMPTS = 5;

export function isInviteCodeClash(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.target ?? "").includes("inviteCode")
  );
}
