import * as path from "path";

import type { IdentityTarget } from "./identity-catalog";

export interface UploadPlanItem { file: string; target: IdentityTarget; missing: boolean }

export type CsvEntry = { folder: string; file: string };

export function planUploads(targets: IdentityTarget[], featuresCsv: Map<string, CsvEntry>, identityCsv: Map<string, CsvEntry>, roots: { features: string; identity: string }): UploadPlanItem[] {
  return targets.map((target) => {
    const isFeature = target.kind === "features";

    const entry = (isFeature ? featuresCsv : identityCsv).get(target.recordId);

    return { target, file: entry ? path.join(isFeature ? roots.features : roots.identity, entry.folder, entry.file) : "", missing: !entry };
  });
}
