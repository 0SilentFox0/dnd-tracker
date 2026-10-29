import "server-only";
import { exampleOf } from "@/lib/constants/import-aliases";
import type { Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";
import { assertCan } from "@/lib/server/content/access";
import { loadNames } from "@/lib/server/content/import/names";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { localeOrRequest } from "@/lib/utils/api/translate-error";
import { IMPORT_SPECS } from "@/lib/utils/content/import/fields";
import { refKindsOf } from "@/lib/utils/content/import/kinds";
import { toCsv } from "@/lib/utils/content/import/table";
import type { IdName } from "@/types/common";
import type { ImportKind } from "@/types/content-import";

type ExampleDeps = { loadNames(campaignId: string, kind: ImportKind): Promise<IdName[]>; locale?: Locale };

export async function exampleCsv(actor: Actor, kind: ImportKind, deps: ExampleDeps = { loadNames }): Promise<string> {
  assertCan(actor, NEED.read("dm"));

  const locale = await localeOrRequest(deps.locale);

  const t = await getTranslator(locale);

  const spec = IMPORT_SPECS[kind];

  const refKinds = refKindsOf(spec, ["ref"]);

  const firstName = new Map(await Promise.all(refKinds.map(async (k) => [k, (await deps.loadNames(actor.campaignId, k))[0]?.name ?? ""] as const)));

  const rows = ([0, 1] as const).map((i) => spec.fields.map((f) => (f.type === "ref" && f.ref ? (firstName.get(f.ref) ?? "") : exampleOf(locale, kind, f.key)[i])));

  return toCsv(spec.fields.map((f) => t(f.labelKey)), rows);
}
