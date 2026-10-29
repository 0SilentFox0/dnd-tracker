import { useTranslations } from "next-intl";
import { Loader2, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

export const TOOL_LABEL_KEYS = {
  read_scenario_page: "readScenarioPage",
  search_reference: "searchReference",
  get_battle_state: "getBattleState",
  get_party: "getParty",
  propose_scenario_edit: "proposeScenarioEdit",
  propose_scene_slide: "proposeSceneSlide",
} as const;

const isLabelled = (name: string): name is keyof typeof TOOL_LABEL_KEYS => name in TOOL_LABEL_KEYS;

interface ToolPart {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
}

export const toolName = (type: string) => type.replace(/^tool-/, "");

export function AiToolChip({ part }: { part: ToolPart }) {
  const t = useTranslations("ai");

  const name = toolName(part.type);

  const input = part.input && typeof part.input === "object" ? (part.input as Record<string, unknown>) : {};

  const label = isLabelled(name) ? t(`tools.${TOOL_LABEL_KEYS[name]}`, { query: String(input.query ?? "") }) : name;

  const running = part.state === "input-streaming" || part.state === "input-available";

  let output = part.output;

  if (typeof output === "string") { try { output = JSON.parse(output); } catch { output = null; } }

  const result = output && typeof output === "object" ? output as { ok?: boolean; kind?: string; data?: { kind?: string }; result?: { kind?: string } } : null;

  const failed = part.state === "output-error" || (result?.ok === false || result?.kind === "error");

  const kind = result?.data?.kind ?? result?.result?.kind ?? result?.kind;

  const status = t(`toolStatus.${failed ? "error" : kind === "pending" ? "pending" : kind === "handoff" ? "handoff" : running ? "running" : "result"}`);

  return (
    <span data-slot="ai-tool-chip" className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground", failed && "border-destructive/50 text-destructive")}>
      {running ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Wrench className="size-3" aria-hidden />}
      <span>{status}</span><span>{label}</span>
    </span>
  );
}
