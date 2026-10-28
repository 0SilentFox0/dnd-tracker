import type { ActionPreview, AssistantActionDef, ExecutionMode } from "./types";

import "server-only";
import { ContentError } from "@/lib/server/content/errors";

const EFFECT_KINDS = new Set(["update", "create", "delete", "erase-progress", "change-access", "publish", "paid"]);

const HUMAN_EFFECTS = new Set(["delete", "erase-progress", "change-access"]);

export function confirmationFor(def: AssistantActionDef, mode: ExecutionMode, preview: ActionPreview): "none" | "human" {
  if (mode !== "review" && mode !== "auto") throw new ContentError("Невідомий режим виконання", 400);

  if (!Array.isArray(preview.effects) || preview.effects.some((e) => !e || !EFFECT_KINDS.has(e.kind))) throw new ContentError("Некоректний перегляд дії", 400);

  if (def.effect === "read" || def.effect === "handoff") return "none";

  if (def.confirmation !== "standard" && def.confirmation !== "always") throw new ContentError("Невідома політика підтвердження", 400);

  if (def.need.sessionOnly || def.confirmation === "always" || preview.effects.some((e) => HUMAN_EFFECTS.has(e.kind))) return "human";

  return mode === "review" ? "human" : "none";
}
