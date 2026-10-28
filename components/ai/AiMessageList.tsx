import type { ReactNode } from "react";
import type { UIMessage } from "ai";

import { AiToolChip, toolName } from "./AiToolChip";

import { ScenarioRichText } from "@/components/scenario/ScenarioRichText";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markdownToDoc } from "@/lib/utils/scenario/markdown";
import type { AiMessageMetadata } from "@/types/ai";

interface AiMessageListProps {
  messages: UIMessage[];
  campaignId?: string;
  error?: string | null;
  renderProposal?: (proposalId: string) => ReactNode;
  onRedo?: () => void;
}

type Part = { type: string; text?: string; state?: string; input?: unknown; output?: unknown; toolCallId?: string };

const PROPOSAL_TOOLS = new Set(["propose_scenario_edit", "propose_scene_slide"]);

function proposalIdOf(output: unknown): string | null {
  let value = output;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  const id = value && typeof value === "object" ? (value as { proposalId?: unknown }).proposalId : null;

  return typeof id === "string" ? id : null;
}

function PlainText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, j) => (
        <p key={j} className="whitespace-pre-wrap">{para}</p>
      ))}
    </>
  );
}

function toDoc(text: string) {
  try {
    return markdownToDoc(text);
  } catch {
    return null;
  }
}

function AssistantText({ text }: { text: string }) {
  const doc = toDoc(text);

  if (!doc) return <PlainText text={text} />;

  return (
    <div className="scenario-book scenario-book--inline">
      <ScenarioRichText doc={doc} campaignId="" />
    </div>
  );
}

const errorOf = (m: UIMessage) => (m.metadata as { error?: string } | undefined)?.error;

export function AiMessageList({ campaignId, messages, error, renderProposal, onRedo }: AiMessageListProps) {
  return (
    <div className="flex flex-col gap-3" data-slot="ai-message-list">
      {messages.map((m) => (
        <div key={m.id} className={cn("flex flex-col gap-1.5", m.role === "user" ? "items-end" : "items-start")}>
          {(m.parts as Part[]).map((part, i) => {
            if (part.type === "text") {
              if (!part.text) return null;

              return (
                <div key={i} className={cn("max-w-[92%] space-y-2 rounded-lg px-3 py-2 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {m.role === "user" ? <PlainText text={part.text} /> : <AssistantText text={part.text} />}
                </div>
              );
            }

            if (!part.type.startsWith("tool-")) return null;

            let output = part.output;

            if (typeof output === "string") { try { output = JSON.parse(output); } catch { output = null; } }

            const envelope = output && typeof output === "object" ? output as { kind?: string; data?: { kind?: string; intent?: { id?: string } } } : null;

            const pending = envelope?.kind === "result" && envelope.data?.kind === "pending" ? envelope.data.intent?.id : null;

            if (campaignId && pending && /^[A-Za-z0-9_-]{1,100}$/.test(pending)) return <div key={part.toolCallId ?? i}><AiToolChip part={part} /><a className="ml-2 underline" href={`/campaigns/${campaignId}/dm/assistant?intent=${pending}`}>Переглянути дію</a></div>;

            const proposalId = PROPOSAL_TOOLS.has(toolName(part.type)) && part.state === "output-available" ? proposalIdOf(part.output) : null;

            return proposalId && renderProposal ? <div key={part.toolCallId ?? i} className="w-full">{renderProposal(proposalId)}</div> : <AiToolChip key={part.toolCallId ?? i} part={part} />;
          })}
          {(m.metadata as AiMessageMetadata | undefined)?.model && <p className="break-words text-xs text-muted-foreground">Модель відповіді: {(m.metadata as AiMessageMetadata).model}</p>}
          {(m.metadata as AiMessageMetadata | undefined)?.usage && <p className="text-xs text-muted-foreground">↑{(m.metadata as AiMessageMetadata).usage?.inputTokens ?? "невідомо"} ↓{(m.metadata as AiMessageMetadata).usage?.outputTokens ?? "невідомо"}{(m.metadata as AiMessageMetadata).usage?.partial ? " (неповні дані)" : ""}</p>}
          {errorOf(m) ? <p className="text-sm text-destructive">{errorOf(m)}</p> : null}
        </div>
      ))}
      {error ? (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <span>{error}</span>
          {onRedo ? <Button type="button" size="sm" variant="outline" onClick={onRedo}>Відновити стан</Button> : null}
        </div>
      ) : null}
    </div>
  );
}
