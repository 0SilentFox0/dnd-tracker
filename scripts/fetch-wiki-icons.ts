#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";

import { chunk, parseImageInfo, planDownloads } from "./fetch-wiki-icons-lib";

const API = "https://mightandmagic.fandom.com/api.php";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

const ASSETS = path.join(process.cwd(), "assets");

const DELAY_MS = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://mightandmagic.fandom.com/",
      },
    });

    if (res.ok || attempt === 3 || (res.status !== 429 && res.status < 500)) return res;

    await sleep(DELAY_MS * 2 ** attempt);
  }
}

function existingFiles(): Set<string> {
  const set = new Set<string>();

  for (const dir of ["skill-icons", "main-skill-icons"]) {
    const full = path.join(ASSETS, dir);

    if (fs.existsSync(full)) for (const f of fs.readdirSync(full)) set.add(`${dir}/${f}`);
  }

  return set;
}

async function main() {
  const todo = planDownloads(existingFiles());

  if (todo.length === 0) {
    console.log("Усі іконки вже є, нічого не качаю");

    return;
  }

  const files = [...new Set(todo.map((d) => d.file))];

  const urls: Record<string, string> = {};

  for (const batch of chunk(files, 50)) {
    const titles = batch.map((f) => `File:${f}`).join("|");

    const res = await get(`${API}?action=query&prop=imageinfo&iiprop=url&format=json&titles=${encodeURIComponent(titles)}`);

    Object.assign(urls, parseImageInfo(await res.json()));
    await sleep(DELAY_MS);
  }

  const missing: string[] = [];

  for (const d of todo) {
    const url = urls[d.file];

    if (!url) {
      missing.push(`${d.key} (${d.file})`);
      continue;
    }

    const res = await get(url);

    if (!res.ok) {
      missing.push(`${d.key} (HTTP ${res.status})`);
      continue;
    }

    fs.mkdirSync(path.join(ASSETS, d.dir), { recursive: true });
    fs.writeFileSync(path.join(ASSETS, d.dir, `${d.key}.png`), Buffer.from(await res.arrayBuffer()));
    console.log(`✓ ${d.dir}/${d.key}.png`);
    await sleep(DELAY_MS);
  }

  if (missing.length) {
    console.error(`Не вдалося: ${missing.join(", ")}`);
    process.exit(1);
  }
}

main();
