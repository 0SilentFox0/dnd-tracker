import { Loader2, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  read_scenario_page: () => "Читаю сторінку…",
  search_reference: (input) => `Шукаю в довіднику: ${String(input.query ?? "")}`,
  get_battle_state: () => "Дивлюся бій…",
  get_party: () => "Дивлюся партію…",
  propose_scenario_edit: () => "Готую пропозицію…",
  propose_scene_slide: () => "Платне зображення: потрібні явний запит і підтвердження",
};

interface ToolPart {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
}

export const toolName = (type: string) => type.replace(/^tool-/, "");

export function AiToolChip({ part }: { part: ToolPart }) {
  const name = toolName(part.type);

  const input = part.input && typeof part.input === "object" ? (part.input as Record<string, unknown>) : {};

  const label = TOOL_LABELS[name]?.(input) ?? name;

  const running = part.state === "input-streaming" || part.state === "input-available";

  let output = part.output;

  if (typeof output === "string") { try { output = JSON.parse(output); } catch { output = null; } }

  const result = output && typeof output === "object" ? output as { ok?: boolean; kind?: string; data?: { kind?: string }; result?: { kind?: string } } : null;

  const failed = part.state === "output-error" || (result?.ok === false || result?.kind === "error");

  const kind = result?.data?.kind ?? result?.result?.kind ?? result?.kind;

  const status = failed ? "Помилка" : kind === "pending" ? "Очікує перегляду" : kind === "handoff" ? "Потрібна дія в застосунку" : running ? "Виконується" : "Результат інструменту";

  return (
    <span data-slot="ai-tool-chip" className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground", failed && "border-destructive/50 text-destructive")}>
      {running ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Wrench className="size-3" aria-hidden />}
      <span>{status}</span><span>{label}</span>
    </span>
  );
}
