import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import type { PreImage } from "@/lib/server/templates/legacy-migration/types";

export type { PreImage };

export async function writePreImage(dir: string, image: PreImage): Promise<string> {
  await mkdir(dir, { recursive: true });

  const file = path.join(dir, `${image.campaignId}-${image.createdAt.replace(/[:.]/g, "-")}.json.gz`);

  await writeFile(file, gzipSync(JSON.stringify(image)));

  return file;
}

export async function readPreImage(file: string): Promise<PreImage> {
  return JSON.parse(gunzipSync(await readFile(file)).toString("utf8")) as PreImage;
}
