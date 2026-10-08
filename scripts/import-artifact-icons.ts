#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";

import { ARTIFACT_ICON_FILES } from "../data/artifact-icons-map";

const DIR = path.join(process.cwd(), "assets", "artifact-icons");

const API = "https://mightandmagic.fandom.com/api.php";

const UA = { "User-Agent": "Mozilla/5.0" };

const norm = (name: string) => name.replace(/_/g, " ").toLowerCase();

async function fileUrls(files: string[]): Promise<Record<string, string>> {
  const titles = files.map((f) => `File:${f}`).join("|");

  const res = await fetch(`${API}?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&format=json`, { headers: UA });

  const json = (await res.json()) as { query: { pages: Record<string, { title: string; imageinfo?: { url: string }[] }> } };

  const out: Record<string, string> = {};

  for (const page of Object.values(json.query.pages)) {
    if (page.imageinfo?.[0]) out[norm(page.title.replace(/^File:/, ""))] = page.imageinfo[0].url;
  }

  return out;
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });

  const todo = Object.entries(ARTIFACT_ICON_FILES).filter(([key]) => !fs.existsSync(path.join(DIR, `${key}.webp`)));

  if (todo.length === 0) return console.info("Усі іконки артефактів уже є");

  const urls = await fileUrls([...new Set(todo.map(([, file]) => file))]);

  for (const [key, file] of todo) {
    const url = urls[norm(file)];

    if (!url) {
      console.error(`Немає файлу на вікі: ${file}`);
      continue;
    }

    // без path-prefix CDN віддає 404; з ним — webp
    const res = await fetch(`${url.split("?")[0]}?path-prefix=en&format=webp`, { headers: UA });

    if (!res.ok) {
      console.error(`${res.status} ${file}`);
      continue;
    }

    fs.writeFileSync(path.join(DIR, `${key}.webp`), Buffer.from(await res.arrayBuffer()));
    console.info(`✓ artifact-icons/${key}.webp`);
  }
}

main();
