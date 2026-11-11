import * as fs from "fs";
import * as path from "path";

import type { GrimRowKind } from "../../grim/data";
import { ASSET_BUCKET } from "../attach-lib";
import type { GrimPromptRow } from "./prompts";

import type { ICON_BUCKETS } from "@/lib/constants/storage";

const SMALL = 256;

export const GRIM_ICON_SIZE: Record<GrimRowKind, number> = { feats: SMALL, careers: SMALL, races: SMALL, spells: SMALL, units: 384, artifacts: SMALL };

export const GRIM_ICON_BUCKET: Record<GrimRowKind, (typeof ICON_BUCKETS)[number]> = {
  feats: "feat-icons",
  careers: "career-icons",
  races: ASSET_BUCKET.races,
  spells: ASSET_BUCKET.spells,
  units: ASSET_BUCKET.units,
  artifacts: ASSET_BUCKET.artifacts,
};

export const planGrimUploads = (rows: GrimPromptRow[], dir: string) =>
  rows.map((row) => {
    const file = path.join(dir, row.file);

    return { row, path: file, missing: !fs.existsSync(file) };
  });
