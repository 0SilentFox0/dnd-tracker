// Public DTOs have no stored action payload, origin token identity or credentials.
export type { ActionPreview, ActionResult, DispatchResult, ExecutionMode, FieldChange, HandoffResult, IntentDetail, IntentStatus, IntentSummary, ReceiptDto, TargetRef } from "@/lib/server/assistant/types";
import type { IntentSummary } from "@/lib/server/assistant/types";

export type IntentPage = { items: IntentSummary[]; nextCursor: string | null };

export type AssistantReviewReceipt = import("@/lib/server/assistant/types").ReceiptDto | { id: string; status: "applied"; deleted: true };
