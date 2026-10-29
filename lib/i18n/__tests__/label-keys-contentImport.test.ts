import { describe, expect, it } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { LOCALES } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";
import { autoMap, IMPORT_MODES, IMPORT_SPECS, IMPORT_STATUSES } from "@/lib/utils/content/import";
import type { ImportKind } from "@/types/content-import";

const KINDS = Object.keys(IMPORT_SPECS) as ImportKind[];

describe("content import labels have translations", () => {
  expectLabelKeys("contentImport", "kinds", KINDS);
  expectLabelKeys("contentImport", "modes", IMPORT_MODES);
  expectLabelKeys("contentImport", "wizard.steps", ["file", "columns", "preview", "result"]);
  expectLabelKeys("contentImport", "file", ["empty", "csvUnreadable", "badJson", "jsonShape", "noRows", "xlsxUnsupported", "unsupportedType"]);
  expectLabelKeys("contentImport", "details", ["integerExpected", "integerExpectedGot", "numberExpected", "numberExpectedGot", "booleanExpected", "enumUnknown", "listUnknown", "diceCount", "diceExpected", "crExpected", "jsonInvalid", "attackUnparsed"]);
  expectLabelKeys("contentImport", "issues", ["fieldInvalid", "columnSkipped", "columnWarning", "duplicateColumns", "unknownField", "refNotFound", "noName", "duplicateName", "alreadyExists", "multipleMatches"]);

  for (const status of IMPORT_STATUSES) expectLabelKeys("contentImport", `status.${status}`, ["done", "planned"]);

  for (const kind of KINDS) expectLabelKeys("contentImport", `fields.${kind}`, IMPORT_SPECS[kind].fields.map((f) => f.key));

  for (const locale of LOCALES) {
    it(`${locale}: every field label maps back to its field as a column header`, async () => {
      const tree = (await localSource.load(locale, "contentImport")) as { fields: Record<string, Record<string, string>> };

      for (const kind of KINDS) {
        const { fields } = IMPORT_SPECS[kind];

        for (const f of fields) {
          const header = tree.fields[kind][f.key];

          expect(autoMap([header], fields)[header], `${locale} ${kind}.${f.key} "${header}"`).toBe(f.key);
        }
      }
    });
  }
});
