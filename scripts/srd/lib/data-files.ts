import * as fs from "fs";
import * as path from "path";

import { SRD_CREDITS } from "./credits";
import { OPEN5E_PATH, OPEN5E_REPO, OPEN5E_SHA, SRD_DATA_DIR } from "./source";
import { SRD_KINDS, type SrdData, type SrdKind } from "./types";

export interface SrdManifest {
  name: string;
  source: { repo: string; path: string; sha: string };
  license: "CC-BY-4.0";
  generatedAt: string;
  counts: Record<SrdKind, number>;
  credits: string;
}

const fileOf = (dir: string, name: string) => path.join(dir, `${name}.json`);

const write = (file: string, value: unknown) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

export function writeSrdData(data: SrdData, dir: string, date: string): SrdManifest {
  fs.mkdirSync(dir, { recursive: true });

  for (const kind of SRD_KINDS) write(fileOf(dir, kind), data[kind]);

  const manifest: SrdManifest = {
    name: "SRD 5.2",
    source: { repo: OPEN5E_REPO, path: OPEN5E_PATH, sha: OPEN5E_SHA },
    license: "CC-BY-4.0",
    generatedAt: date,
    counts: Object.fromEntries(SRD_KINDS.map((k) => [k, data[k].length])) as Record<SrdKind, number>,
    credits: SRD_CREDITS,
  };

  write(fileOf(dir, "manifest"), manifest);

  return manifest;
}

export const readSrdData = (dir = SRD_DATA_DIR): SrdData => Object.fromEntries(SRD_KINDS.map((k) => [k, JSON.parse(fs.readFileSync(fileOf(dir, k), "utf8"))])) as SrdData;

export const readSrdManifest = (dir = SRD_DATA_DIR): SrdManifest => JSON.parse(fs.readFileSync(fileOf(dir, "manifest"), "utf8")) as SrdManifest;

export function toImportRows<T extends { slug: string }>(rows: T[]): Record<string, unknown>[];
export function toImportRows(rows: ReadonlyArray<{ slug: string }>): Record<string, unknown>[];
export function toImportRows(rows: ReadonlyArray<{ slug: string }>): Record<string, unknown>[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "slug")));
}
