import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import "server-only";

export type EncryptedSecret = { ciphertext: string; iv: string; authTag: string; keyVersion: number };

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI_KEYS_SECRET is not set");
    this.name = "AiNotConfiguredError";
  }
}

const CURRENT_VERSION = 1;

// version 0 = the previous master key during a rotation; rows are re-encrypted on the next save
function masterKey(version: number): Buffer {
  const raw = version === CURRENT_VERSION ? process.env.AI_KEYS_SECRET : process.env.AI_KEYS_SECRET_PREV;

  const buf = raw ? Buffer.from(raw, "base64") : null;

  if (!buf || buf.length !== 32) throw new AiNotConfiguredError();

  return buf;
}

export function isAiConfigured(): boolean {
  try {
    masterKey(CURRENT_VERSION);

    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string): EncryptedSecret {
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", masterKey(CURRENT_VERSION), iv);

  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: CURRENT_VERSION,
  };
}

export function decryptSecret(s: EncryptedSecret): string {
  const decipher = createDecipheriv("aes-256-gcm", masterKey(s.keyVersion), Buffer.from(s.iv, "base64"));

  decipher.setAuthTag(Buffer.from(s.authTag, "base64"));

  return Buffer.concat([decipher.update(Buffer.from(s.ciphertext, "base64")), decipher.final()]).toString("utf8");
}
