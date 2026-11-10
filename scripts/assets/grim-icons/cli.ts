#!/usr/bin/env tsx
// pnpm assets:grim-icons prompts [--out <dir>]
// pnpm assets:grim-icons upload <templateId> [--dir <images>] [--dry-run] [--allow-remote]
import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { GRIM_ROW_KINDS, readGrimData } from "../../grim/data";
import { emptyGrimIcons, grimIconGaps, type GrimIcons, mergeGrimIcons, readGrimIcons, writeGrimIcons } from "../../grim/icons";
import { assertSeedTarget, assertStorageTarget } from "../../seed/seed-library-lib";
import { assertCleanPrompt, assertUniqueFiles, type PromptRow, toMarkdown } from "../icon-prompts/compose";
import { toWebp } from "../tokens-5e/convert";
import { type GrimPromptRow, grimPromptRows, type GrimSubjects } from "./prompts";
import { GRIM_ICON_BUCKET, GRIM_ICON_SIZE, planGrimUploads } from "./upload";

import { CampaignKind, GRIM_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { staticAssetUploadOptions } from "@/lib/supabase/storage-cache";

const USAGE = "Використання: pnpm assets:grim-icons prompts [--out <dir>] | upload <templateId> [--dir <images>] [--dry-run] [--allow-remote]";

const SUBJECTS_DIR = path.join(__dirname, "..", "icon-subjects");

const DEFAULT_OUT = "docs/assets/icon-prompts/grim-d100";

const DEFAULT_ICONS_DIR = path.join(os.homedir(), "Downloads", "fantasy-tokens", "output-grim", "icons");

const KB = 1024;

const readSubject = <T>(name: string) => JSON.parse(fs.readFileSync(path.join(SUBJECTS_DIR, `grim-${name}.json`), "utf8")) as T;

const loadRows = (): GrimPromptRow[] => {
  const subjects: GrimSubjects = { units: readSubject("units"), spells: readSubject("spells"), artifacts: readSubject("artifacts"), identity: readSubject("identity") };

  return grimPromptRows(readGrimData(), subjects);
};

const flag = (args: string[], name: string) => {
  const i = args.indexOf(name);

  if (i < 0) return undefined;

  if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`${name} потребує значення. ${USAGE}`);

  return args[i + 1];
};

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

function writePrompts(out: string) {
  const rows = loadRows();

  const asPromptRows: PromptRow[] = rows.map((r) => ({ file: r.file, name: r.name, kind: "skills", prompt: r.prompt, group: r.kind }));

  asPromptRows.forEach((r) => assertCleanPrompt(r));
  assertUniqueFiles(asPromptRows, "grim-d100");

  fs.mkdirSync(out, { recursive: true });

  for (const kind of GRIM_ROW_KINDS) {
    const lines = rows.filter((r) => r.kind === kind).map((r) => [r.recordId, r.name, r.file, r.prompt].map(csvCell).join(","));

    fs.writeFileSync(path.join(out, `${kind}.csv`), `record_id,name,output_filename,prompt\n${lines.join("\n")}\n`);
  }

  const intro = "Промпти для генерації іконок Grim d100. Зображення генерує `generate_grim.py` у `~/Downloads/fantasy-tokens` (вихід `output-grim/icons/<kind>/<файл>.png`, 768 px); `pnpm assets:grim-icons upload <templateId>` бере їх звідти. На зображеннях заборонений будь-який текст.";

  fs.writeFileSync(path.join(out, "README.md"), toMarkdown("Іконки Grim d100", intro, asPromptRows));

  console.info(`${rows.length} промптів у ${out}`);
}

async function uploadIcons(args: string[]) {
  const dryRun = args.includes("--dry-run");

  const dir = flag(args, "--dir") ?? DEFAULT_ICONS_DIR;

  const templateId = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--dir" && a !== "upload");

  if (!templateId) throw new Error(USAGE);

  if (!dryRun) {
    const { prisma } = await import("@/lib/db");

    assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

    assertStorageTarget(process.env.NEXT_PUBLIC_SUPABASE_URL, args.includes("--allow-remote"));

    const campaign = await prisma.campaign.findUnique({ where: { id: templateId }, select: { name: true, kind: true } });

    if (campaign?.name !== GRIM_TEMPLATE_NAME || campaign.kind !== CampaignKind.TEMPLATE) throw new Error(`Кампанія ${templateId} не є шаблоном «${GRIM_TEMPLATE_NAME}»`);
  }

  const admin = dryRun ? null : createAdminClient();

  const ensured = new Set<string>();

  const uploaded: GrimIcons = emptyGrimIcons();

  const errors: string[] = [];

  let missing = 0;

  let count = 0;

  let total = 0;

  for (const { row, path: file, missing: absent } of planGrimUploads(loadRows(), dir)) {
    if (absent) {
      console.warn(`немає файлу: ${file}`);
      missing += 1;
      continue;
    }

    const webp = await toWebp(fs.readFileSync(file), GRIM_ICON_SIZE[row.kind]);

    count += 1;
    total += webp.length;

    if (!admin) continue;

    const bucket = GRIM_ICON_BUCKET[row.kind];

    if (!ensured.has(bucket)) {
      const res = await ensureBucket(admin, bucket);

      if (!res.ok) throw new Error(res.message);

      ensured.add(bucket);
    }

    const objectName = `${templateId}/${row.file.replace(/\.png$/, "")}-${createHash("sha1").update(webp).digest("hex").slice(0, 8)}.webp`;

    const { error } = await admin.storage.from(bucket).upload(objectName, webp, staticAssetUploadOptions("image/webp"));

    if (error) {
      errors.push(`${row.recordId}: ${error.message}`);
      continue;
    }

    uploaded[row.kind][row.name] = admin.storage.from(bucket).getPublicUrl(objectName).data.publicUrl;
  }

  console.info(`${dryRun ? "конвертовано (dry-run)" : "завантажено"}: ${dryRun ? count : Object.values(uploaded).reduce((n, m) => n + Object.keys(m).length, 0)}, сумарно ${(total / KB).toFixed(0)} КБ; без файлу: ${missing}`);

  for (const e of errors) console.warn(`  не завантажено: ${e}`);

  const data = readGrimData();

  if (!dryRun) {
    const next = mergeGrimIcons(readGrimIcons(), uploaded, data);

    writeGrimIcons(next);

    for (const gap of grimIconGaps(data, next)) console.warn(gap);
  }

  if (errors.length > 0 || missing > 0) process.exitCode = 1;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (command === "prompts") return writePrompts(flag(rest, "--out") ?? DEFAULT_OUT);

  if (command === "upload") return uploadIcons(rest);

  throw new Error(USAGE);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.argv[2] === "upload" && !process.argv.includes("--dry-run")) await (await import("@/lib/db")).prisma.$disconnect();
  });
