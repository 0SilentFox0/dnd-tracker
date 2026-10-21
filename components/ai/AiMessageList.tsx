import type { ReactNode } from "react";
import type { UIMessage } from "ai";

import { AiToolChip, toolName } from "./AiToolChip";

import { ScenarioRichText } from "@/components/scenario/ScenarioRichText";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markdownToDoc } from "@/lib/utils/scenario/markdown";

interface AiMessageListProps {
  messages: UIMessage[];
  error?: string | null;
  renderProposal?: (proposalId: string) => ReactNode;
  onRedo?: () => void;
}

type Part = { type: string; text?: string; state?: string; input?: unknown; output?: unknown; toolCallId?: string };

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

export function AiMessageList({ messages, error, renderProposal, onRedo }: AiMessageListProps) {
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

            const proposalId = toolName(part.type) === "propose_scenario_edit" && part.state === "output-available" ? proposalIdOf(part.output) : null;

            return proposalId && renderProposal ? <div key={part.toolCallId ?? i} className="w-full">{renderProposal(proposalId)}</div> : <AiToolChip key={part.toolCallId ?? i} part={part} />;
          })}
          {errorOf(m) ? <p className="text-sm text-destructive">{errorOf(m)}</p> : null}
        </div>
      ))}
      {error ? (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <span>{error}</span>
          {onRedo ? <Button type="button" size="sm" variant="outline" onClick={onRedo}>Повторити</Button> : null}
        </div>
      ) : null}
    </div>
  );
}
