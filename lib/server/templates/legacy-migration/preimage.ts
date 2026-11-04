import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import type { PreImage } from "@/lib/server/templates/legacy-migration/types";

export type { PreImage };

export const PENDING_SUFFIX = ".pending";

/** Written before the DB writes as `*.pending`; only a committed migration renames it to the usable file. */
export async function writePreImage(dir: string, image: PreImage): Promise<string> {
  await mkdir(dir, { recursive: true });

  const file = path.join(dir, `${image.campaignId}-${image.createdAt.replace(/[:.]/g, "-")}.json.gz${PENDING_SUFFIX}`);

  await writeFile(file, gzipSync(JSON.stringify(image)));

  return file;
}

export async function finalizePreImage(pending: string): Promise<string> {
  const final = pending.slice(0, -PENDING_SUFFIX.length);

  await rename(pending, final);

  return final;
}

export const discardPreImage = (pending: string) => rm(pending, { force: true });

export async function readPreImage(file: string): Promise<PreImage> {
  if (file.endsWith(PENDING_SUFFIX)) throw new Error("PRE_IMAGE_PENDING: the migration that wrote this file did not commit");

  return JSON.parse(gunzipSync(await readFile(file)).toString("utf8")) as PreImage;
}
