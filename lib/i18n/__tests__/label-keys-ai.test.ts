import { describe, expect, it } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { TOOL_LABEL_KEYS } from "@/components/ai/AiToolChip";
import { AI_THREAD_MODES, API_TOKEN_SCOPES, tokenScopeKey } from "@/lib/constants/ai";
import { ASSISTANT_EFFECT_STATUSES, ASSISTANT_INTENT_STATUSES } from "@/lib/constants/assistant";

describe("ai label registries have translations", () => {
  expectLabelKeys("ai", "modes", AI_THREAD_MODES);
  expectLabelKeys("ai", "tokenScopes", API_TOKEN_SCOPES.map(tokenScopeKey));
  expectLabelKeys("ai", "tools", Object.values(TOOL_LABEL_KEYS));
  expectLabelKeys("ai", "toolStatus", ["error", "pending", "handoff", "running", "result"]);
  expectLabelKeys("ai", "intentStatus", ASSISTANT_INTENT_STATUSES);
  expectLabelKeys("ai", "effectsStatus", ASSISTANT_EFFECT_STATUSES);
  expectLabelKeys("ai", "policy.modes", ["auto", "review"]);
  expectLabelKeys("ai", "composer.quickPrompts", ["npcName", "nextInScenario", "dc"]);
  expectLabelKeys("ai", "workspace.kinds", ["campaign", "scenario", "character", "battle"]);
  expectLabelKeys("ai", "proposal.status", ["applied", "rejected"]);
  expectLabelKeys("ai", "context.blocks", ["system", "campaignName", "policy", "standing", "mode", "capabilities", "domains", "campaign", "party", "rules", "show", "notes", "focusUnavailable", "focusPage", "focus", "truncation"]);
  expectLabelKeys("ai", "focus", ["character", "battle", "campaign", "page", "rows", "section", "sectionRows"]);
});

describe("ai tool labels", () => {
  it("map only registered tool names", async () => {
    const { AI_TOOLS } = await import("@/lib/ai/tools");

    const names = new Set(AI_TOOLS.map((def) => def.name));

    for (const name of Object.keys(TOOL_LABEL_KEYS)) expect(names.has(name), name).toBe(true);
  }, 30_000);
});
