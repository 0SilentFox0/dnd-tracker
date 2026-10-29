import { useTranslations } from "next-intl";

import { IMPORT_STATUSES } from "@/lib/utils/content/import/kinds";
import type { ImportReport } from "@/types/content-import";

export function ImportCounts({ report }: { report: ImportReport }) {
  const t = useTranslations("contentImport.status");

  return (
    <ul className="flex flex-wrap gap-2 text-sm">
      {IMPORT_STATUSES.filter((s) => report.counts[s] > 0 || s === "created").map((s) => (
        <li key={s} className={s === "error" ? "rounded border border-red-500/40 px-2 py-0.5 text-red-400" : "rounded border border-hud-muted/30 px-2 py-0.5"}>
          {`${t(`${s}.${report.dryRun ? "planned" : "done"}`)}: ${report.counts[s]}`}
        </li>
      ))}
    </ul>
  );
}
