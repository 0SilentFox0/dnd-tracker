import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { CharacterLogKind } from "@/lib/constants/character-log";
import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

describe("rest log lines have translations", () => {
  const keys = Object.values(CharacterLogKind).flatMap((kind) => [describeCharacterLog({ kind, data: {} }).key, describeCharacterLog({ kind, data: { value: true } }).key]);

  expectLabelKeys("rest", "log", [...new Set(keys)].map((k) => k.replace("rest.log.", "")));
});
