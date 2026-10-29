import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { CALLOUT_KINDS, LEGEND_KINDS, MENTION_TYPES, PAGE_KINDS, PAGE_STATUSES, SECTION_ICON_KEYS } from "@/lib/constants/scenario";

describe("scenario labels have translations", () => {
  expectLabelKeys("scenario", "pageKinds", PAGE_KINDS);
  expectLabelKeys("scenario", "pageStatuses", PAGE_STATUSES);
  expectLabelKeys("scenario", "calloutKinds", CALLOUT_KINDS);
  expectLabelKeys("scenario", "legendKinds", LEGEND_KINDS);
  expectLabelKeys("scenario", "mentionTypes", MENTION_TYPES);
  expectLabelKeys("scenario", "sectionIcons", SECTION_ICON_KEYS);
  expectLabelKeys("scenario", "save", ["saved", "dirty", "saving", "error", "conflict"]);
  expectLabelKeys("scenario", "acquaintance.kinds", ["micro", "character"]);
  expectLabelKeys("dashboard", "battleStatus", ["prepared", "active", "completed"]);
});
