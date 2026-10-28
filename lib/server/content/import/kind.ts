import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { isImportKind } from "@/lib/utils/content/import/kinds";
import type { ImportKind } from "@/types/content-import";

export function importKindOf(value: string | undefined): ImportKind {
  if (!value || !isImportKind(value)) throw new ContentError(API_ERRORS.IMPORT_UNKNOWN_KIND, 404);

  return value;
}
