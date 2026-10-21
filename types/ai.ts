import type { AiProvider, AiThreadMode } from "@/lib/constants/ai";
import type { RichDoc, ScenarioRow, ScenarioSection } from "@/types/scenario";

export type { AiProvider, AiThreadMode };

export type AiProposalStatus = "pending" | "applied" | "rejected" | "stale";

export interface AiCredentialSummary {
  provider: AiProvider;
  last4: string;
  defaultModel: string | null;
  updatedAt: string;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AiThread {
  id: string;
  mode: AiThreadMode;
  scenarioPageId: string | null;
  title: string;
  provider: AiProvider;
  model: string;
  updatedAt: string;
  usage: AiUsage;
}

export interface AiMessageMetadata {
  usage?: AiUsage;
  model?: string;
  error?: string;
}

/** Збережене повідомлення у форматі UIMessage AI SDK (parts як є). */
export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: unknown[];
  metadata?: AiMessageMetadata;
}

export interface AiFocus {
  pageId: string;
  sectionId?: string;
  rowIds?: string[];
}

export type ScenarioAiOpInput =
  | { op: "replaceRow"; sectionId: string; rowId: string; story?: string; notes?: string; allowRemoval?: boolean }
  | { op: "insertRow"; sectionId: string; afterRowId?: string; story: string; notes?: string }
  | { op: "addSection"; afterSectionId?: string; title: string; rows: { story: string; notes?: string }[] }
  | { op: "renameSection"; sectionId: string; title: string };

export type ScenarioAiOp =
  | { op: "replaceRow"; sectionId: string; rowId: string; story?: RichDoc; notes?: RichDoc; before: { story: RichDoc; notes: RichDoc } }
  | { op: "insertRow"; sectionId: string; afterRowId: string | null; row: ScenarioRow }
  | { op: "addSection"; afterSectionId: string | null; section: ScenarioSection }
  | { op: "renameSection"; sectionId: string; title: string; before: { title: string } };

export interface AiProposal {
  id: string;
  pageId: string;
  threadId: string | null;
  summary: string;
  ops: ScenarioAiOp[];
  status: AiProposalStatus;
  appliedVersion: number | null;
  createdAt: string;
}

export interface AiSettings {
  instructions: string | null;
}

export interface ApiTokenSummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreatedApiToken extends ApiTokenSummary {
  token: string;
}
