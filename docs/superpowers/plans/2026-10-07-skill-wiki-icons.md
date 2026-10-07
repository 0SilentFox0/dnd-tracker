# Skill Wiki Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download Heroes V perk icons from mightandmagic.fandom.com once, keep them in `assets/`, and upload them to public Supabase Storage buckets so the app never hits the wiki at runtime.

**Architecture:** A typed map `iconKey → wiki filename` (`data/skill-icons.ts`) is the single list. A tsx script resolves the real image URLs through the MediaWiki API in batches, downloads them politely (sequential, delay, own User-Agent, skip existing files) into `assets/skill-icons/<iconKey>.png` and `assets/main-skill-icons/<iconKey>.png`. The existing `scripts/upload-assets-to-supabase.ts` uploads them with one-year cache. A pure helper builds the public URL from an `iconKey` for the later seed (subproject C).

**Tech Stack:** TypeScript, tsx, Node `fetch`, Supabase Storage (`@supabase/supabase-js` admin client), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-skills-rebalance-design.md` (§6)

## Global Constraints

- Icons are stored as the original PNG (no `sharp` — it is not a project dependency).
- Paths are stable keys → immutable; upload with `staticAssetUploadOptions` (cache 1 year).
- Buckets: `skill-icons` (skills), `main-skill-icons` (branches and branch levels).
- `static.wikia.nocookie.net` stays in `next.config.ts` (units still use it).
- `no-console` is relaxed in `scripts/`; comments minimal; blank lines around statements (`padding-line-between-statements`).

## Review Focus

- Re-running the fetch script downloads nothing when all files exist (no wiki load).
- A wiki filename that no longer exists → script reports it by key and exits non-zero, after downloading the rest.
- Filenames with `.PNG` upper-case extension are saved as `<key>.png`.
- Wiki returns HTTP 429/5xx → retry with backoff (3 attempts) instead of failing the whole run.
- Same wiki file used by several keys (Archery for 4 keys) is fetched once per key path but resolved once.

---

### Task 1: Icon map and public URL helper

**Files:**
- Create: `data/skill-icons.ts`
- Create: `data/__tests__/skill-icons.test.ts`

**Interfaces:**
- Produces: `SKILL_ICONS: Record<string, string>`, `BRANCH_ICONS: Record<string, string>` (iconKey → wiki filename), `iconBucket(key: string): "skill-icons" | "main-skill-icons"`, `iconPublicUrl(supabaseUrl: string, key: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { BRANCH_ICONS, iconBucket, iconPublicUrl, SKILL_ICONS } from "@/data/skill-icons";

describe("skill icons map", () => {
  it("has no key collisions between skills and branches", () => {
    const overlap = Object.keys(SKILL_ICONS).filter((k) => k in BRANCH_ICONS);

    expect(overlap).toEqual([]);
  });

  it("uses only H5 wiki png files", () => {
    for (const file of [...Object.values(SKILL_ICONS), ...Object.values(BRANCH_ICONS)]) {
      expect(file).toMatch(/^H5[A-Za-z]+\.(png|PNG)$/);
    }
  });

  it("covers 8 branches × (branch + 3 levels)", () => {
    expect(Object.keys(BRANCH_ICONS)).toHaveLength(32);
  });

  it("builds a public storage url per bucket", () => {
    expect(iconBucket("attack")).toBe("main-skill-icons");
    expect(iconBucket("cleaving-strike")).toBe("skill-icons");
    expect(iconPublicUrl("https://x.supabase.co", "cleaving-strike")).toBe(
      "https://x.supabase.co/storage/v1/object/public/skill-icons/cleaving-strike.png",
    );
  });
});
```

- [ ] **Step 2: Run it — expect FAIL (module missing)**

Run: `pnpm test:run data/__tests__/skill-icons.test.ts`

- [ ] **Step 3: Implement `data/skill-icons.ts`**

Branch keys: `attack`, `ranged`, `defense`, `light`, `dark`, `chaos`, `nature`, `leadership`; level keys `<branch>-basic|advanced|expert`.

```ts
const LEVELS = ["basic", "advanced", "expert"] as const;

const H5_BRANCH: Record<string, string> = {
  attack: "Attack",
  defense: "Defense",
  light: "LightMagic",
  dark: "DarkMagic",
  chaos: "DestructiveMagic",
  nature: "SummoningMagic",
  leadership: "Leadership",
};

function branchEntries(): [string, string][] {
  const entries: [string, string][] = [];

  for (const [key, h5] of Object.entries(H5_BRANCH)) {
    entries.push([key, `H5Basic${h5}.png`]);

    for (const level of LEVELS) entries.push([`${key}-${level}`, `H5${level[0].toUpperCase()}${level.slice(1)}${h5}.png`]);
  }

  // H5 has no archery skill line, only the perk icon
  entries.push(["ranged", "H5Archery.png"], ...LEVELS.map((l): [string, string] => [`ranged-${l}`, "H5Archery.png"]));

  return entries;
}

export const BRANCH_ICONS: Record<string, string> = Object.fromEntries(branchEntries());

export const SKILL_ICONS: Record<string, string> = {
  "cleaving-strike": "H5ExcruciatingStrike.png",
  "stunning-strike": "H5StunningBlow.PNG",
  "armor-break": "H5PowerfulBlow.png",
  brutality: "H5BattleFrenzy.png",
  sequence: "H5ColdSteel.png",
  reward: "H5PowerofSpeed.png",
  zeal: "H5OffensiveFormation.png",
  "crippling-shot": "H5ImbueArrow.png",
  "piercing-bolt": "H5FlamingArrows.png",
  "deflecting-arrow": "H5Distract.png",
  bullseye: "H5DeadeyeShot.png",
  "arrow-cloud": "H5RainofArrows.png",
  "double-shot": "H5Tactics.png",
  "force-arrow": "H5ElvenLuck.png",
  endurance: "H5Vitality.png",
  resilience: "H5Resistance.png",
  guardian: "H5DefendUsAll.PNG",
  "last-stand": "H5LastStand.png",
  "magic-ward": "H5Protection.png",
  readiness: "H5Preparation.png",
  "thorn-armor": "H5ChillingBones.png",
  "righteous-wrath": "H5MasterofWrath.png",
  "granting-protection": "H5MasterofAbjuration.png",
  "granting-blessing": "H5MasterofBlessings.png",
  "eternal-light": "H5EternalLight.png",
  "divine-power": "H5RefinedMana.png",
  benediction: "H5GuardianAngel.png",
  "master-of-pain": "H5MasterofPain.png",
  "master-of-mind": "H5MasterofMind.png",
  "master-of-curses": "H5MasterofCurses.png",
  "deaths-march": "H5SealofDarkness.png",
  devourer: "H5ConsumeCorpse.png",
  "dark-master": "H5DarkRenewal.png",
  compensation: "H5ErraticMana.png",
  "master-of-storms": "H5MasterofStorms.png",
  "master-of-fire": "H5MasterofFire.png",
  "master-of-ice": "H5MasterofIce.png",
  "mana-burst": "H5ManaBurst.png",
  "infernal-power": "H5SecretsofDestruction.png",
  pyrokinesis: "H5Ignite.png",
  "fire-attack": "H5FieryWrath.png",
  "forest-lord": "H5MasterofEarthblood.png",
  "life-force": "H5MasterofLife.png",
  thorns: "H5RunicArmour.png",
  "call-of-the-beast": "H5MasterofConjuration.png",
  "natures-poison": "H5CorruptedSoil.png",
  "natures-wrath": "H5NaturesWrath.png",
  banish: "H5Banish.png",
  "chosen-elemental": "H5ElementalBalance.png",
  "eternal-warriors": "H5FireWarriors.png",
  "forest-roots": "H5FogVeil.png",
  "life-lord": "H5ArcaneBrilliance.png",
  empathy: "H5Empathy.png",
  restoration: "H5DivineGuidance.png",
  retribution: "H5Retribution.png",
  inspiration: "H5BattleCommander.png",
  vengeance: "H5HeraldOfDeath.PNG",
  success: "H5BattleElation.PNG",
};

export function iconBucket(key: string): "skill-icons" | "main-skill-icons" {
  return key in BRANCH_ICONS ? "main-skill-icons" : "skill-icons";
}

export function iconPublicUrl(supabaseUrl: string, key: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${iconBucket(key)}/${key}.png`;
}
```

- [ ] **Step 4: Run tests — expect PASS**; run `pnpm lint --fix data/`.

- [ ] **Step 5: Commit** — `feat(skills): wiki icon map for skills and branches`

### Task 2: Fetch script

**Files:**
- Create: `scripts/fetch-wiki-icons.ts`
- Create: `scripts/fetch-wiki-icons-lib.ts` (pure parts)
- Create: `scripts/__tests__/fetch-wiki-icons-lib.test.ts`
- Modify: `package.json` (script `fetch-wiki-icons`, remove broken `migrate-skill-icons-to-supabase`)

**Interfaces:**
- Consumes: `SKILL_ICONS`, `BRANCH_ICONS` from Task 1.
- Produces: `planDownloads(existing: Set<string>): { key: string; file: string; dir: "skill-icons" | "main-skill-icons" }[]`, `parseImageInfo(json: unknown): Record<string, string>` (wiki filename → url), `chunk<T>(xs: T[], n: number): T[][]`.

- [ ] **Step 1: Failing tests for the pure lib**

```ts
import { describe, expect, it } from "vitest";

import { chunk, parseImageInfo, planDownloads } from "../fetch-wiki-icons-lib";

describe("fetch-wiki-icons lib", () => {
  it("skips keys whose file already exists", () => {
    const all = planDownloads(new Set());
    const some = planDownloads(new Set(["skill-icons/cleaving-strike.png"]));

    expect(all.length - some.length).toBe(1);
    expect(some.find((d) => d.key === "cleaving-strike")).toBeUndefined();
  });

  it("puts branch keys in main-skill-icons", () => {
    expect(planDownloads(new Set()).find((d) => d.key === "ranged-expert")?.dir).toBe("main-skill-icons");
  });

  it("maps normalized wiki titles back to urls", () => {
    const json = {
      query: {
        normalized: [{ from: "File:H5StunningBlow.PNG", to: "File:H5StunningBlow.PNG" }],
        pages: {
          "1": { title: "File:H5StunningBlow.PNG", imageinfo: [{ url: "https://static.wikia.nocookie.net/a.PNG" }] },
          "-1": { title: "File:H5Missing.png", missing: "" },
        },
      },
    };

    expect(parseImageInfo(json)).toEqual({ "H5StunningBlow.PNG": "https://static.wikia.nocookie.net/a.PNG" });
  });

  it("chunks by 50", () => {
    expect(chunk(Array.from({ length: 101 }, (_, i) => i), 50).map((c) => c.length)).toEqual([50, 50, 1]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `pnpm test:run scripts/__tests__/fetch-wiki-icons-lib.test.ts`

- [ ] **Step 3: Implement the lib**

```ts
import { BRANCH_ICONS, SKILL_ICONS } from "../data/skill-icons";

export type IconDir = "skill-icons" | "main-skill-icons";

export interface PlannedDownload {
  key: string;
  file: string;
  dir: IconDir;
}

export function planDownloads(existing: Set<string>): PlannedDownload[] {
  const all: PlannedDownload[] = [
    ...Object.entries(SKILL_ICONS).map(([key, file]) => ({ key, file, dir: "skill-icons" as const })),
    ...Object.entries(BRANCH_ICONS).map(([key, file]) => ({ key, file, dir: "main-skill-icons" as const })),
  ];

  return all.filter((d) => !existing.has(`${d.dir}/${d.key}.png`));
}

export function parseImageInfo(json: unknown): Record<string, string> {
  const pages = (json as { query?: { pages?: Record<string, { title: string; imageinfo?: { url: string }[] }> } }).query?.pages ?? {};

  const out: Record<string, string> = {};

  for (const page of Object.values(pages)) {
    const url = page.imageinfo?.[0]?.url;

    if (url) out[page.title.replace(/^File:/, "")] = url;
  }

  return out;
}

export function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];

  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));

  return out;
}
```

Note: MediaWiki normalizes titles (first letter, spaces) — our names already are canonical, so `normalized` is ignored; a file whose title changed shows up as missing and is reported.

- [ ] **Step 4: Implement `scripts/fetch-wiki-icons.ts`**

```ts
#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";

import { chunk, parseImageInfo, planDownloads } from "./fetch-wiki-icons-lib";

const API = "https://mightandmagic.fandom.com/api.php";
const UA = "dnd-tracker-icon-sync/1.0 (one-off asset import)";
const ASSETS = path.join(process.cwd(), "assets");
const DELAY_MS = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });

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
```

- [ ] **Step 5: `package.json`** — add `"fetch-wiki-icons": "tsx scripts/fetch-wiki-icons.ts"`, delete the `migrate-skill-icons-to-supabase` entry (its file does not exist).

- [ ] **Step 6: Run** `pnpm test:run scripts/__tests__/fetch-wiki-icons-lib.test.ts` (PASS), then `pnpm fetch-wiki-icons` — expect 90 `✓` lines (58 skills + 32 branch keys), then run again — expect «Усі іконки вже є». Check `ls assets/skill-icons/*.png | wc -l` = 58, `ls assets/main-skill-icons | wc -l` = 32.

- [ ] **Step 7: Commit** script, lib, test, `package.json` and the downloaded PNGs — `feat(skills): fetch H5 perk icons from the wiki into assets`

### Task 3: Upload to Storage

**Files:**
- Modify: `scripts/upload-assets-to-supabase.ts` (`BUCKET_FOLDERS` + header comment)

- [ ] **Step 1:** Add `{ bucket: "main-skill-icons", folder: "main-skill-icons" }` to `BUCKET_FOLDERS`; add the line `- assets/main-skill-icons/* → bucket main-skill-icons` to the header comment. Confirm the upload uses `staticAssetUploadOptions` with `contentType` by extension (`.png` → `image/png`); if the script maps only `.webp`, add `.png`.
- [ ] **Step 2:** Ask the user before running against the real project (it writes to prod Storage). Run `pnpm upload-assets-to-supabase`.
- [ ] **Step 3:** Verify: `curl -sI <NEXT_PUBLIC_SUPABASE_URL>/storage/v1/object/public/skill-icons/cleaving-strike.png` → `200`, `content-type: image/png`, `cache-control: max-age=31536000`.
- [ ] **Step 4: Commit** — `chore(assets): upload branch icons bucket`
