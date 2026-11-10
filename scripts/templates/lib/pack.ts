import * as fs from "fs";
import * as path from "path";

import { TemplateManifestSchema } from "@/lib/schemas/template-manifest";
import type { TemplateManifest } from "@/lib/utils/templates/manifest";

export const TEMPLATES_DIR = process.env.TEMPLATES_DIR ?? path.join(process.cwd(), "data/templates");

export const packPath = (key: string, file: string, dir = TEMPLATES_DIR): string => path.join(dir, key, file);

export function listPackKeys(dir = TEMPLATES_DIR): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(packPath(entry.name, "manifest.json", dir)))
    .map((entry) => entry.name)
    .sort();
}

export function readManifest(key: string, dir = TEMPLATES_DIR): TemplateManifest {
  const manifest = TemplateManifestSchema.parse(JSON.parse(fs.readFileSync(packPath(key, "manifest.json", dir), "utf8")));

  if (manifest.key !== key) throw new Error(`Manifest key "${manifest.key}" does not match the folder name "${key}"`);

  return manifest;
}
