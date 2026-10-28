import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { OPEN5E_FILES, OPEN5E_SHA, type Open5eFile, open5eUrl } from "./source";

export const defaultSourceDir = () => path.join(os.tmpdir(), `open5e-srd-2024-${OPEN5E_SHA.slice(0, 8)}`);

export const md5 = (buf: Buffer | string) => createHash("md5").update(buf).digest("hex");

export function verifyFile(file: Open5eFile, buf: Buffer): void {
  const actual = md5(buf);

  if (actual !== OPEN5E_FILES[file]) throw new Error(`${file}.json: md5 ${actual} ≠ ${OPEN5E_FILES[file]}`);
}

export function verifySourceDir(dir: string): string {
  for (const file of Object.keys(OPEN5E_FILES) as Open5eFile[]) verifyFile(file, fs.readFileSync(path.join(dir, `${file}.json`)));

  return dir;
}

export async function fetchOpen5e(dir = defaultSourceDir(), fetchImpl: typeof fetch = fetch): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });

  for (const file of Object.keys(OPEN5E_FILES) as Open5eFile[]) {
    const target = path.join(dir, `${file}.json`);

    if (fs.existsSync(target) && md5(fs.readFileSync(target)) === OPEN5E_FILES[file]) continue;

    const res = await fetchImpl(open5eUrl(file));

    if (!res.ok) throw new Error(`${file}.json: HTTP ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());

    verifyFile(file, buf);
    fs.writeFileSync(target, buf);
  }

  return dir;
}
