/** Existing executor/storage budgets; changing values is a separate policy change. */
export const ASSISTANT_LIMITS = {
  intentTtlMs: 900_000,
  maxPayloadBytes: 3_000_000,
  transactionTimeoutMs: 30_000,
  transactionMaxWaitMs: 5_000,
  runGraceMs: 30_000,
  intentRedactionDays: 7,
  receiptRetentionDays: 90,
} as const;

export const ASSISTANT_INTENT_STATUSES = ["pending", "executing", "applied", "rejected", "stale", "expired", "failed", "unknown"] as const;
export const ASSISTANT_EFFECT_STATUSES = ["pending", "complete", "failed", "unknown"] as const;

// Separate retention policies: neither is the run lease's terminal mapping.
export const ASSISTANT_REDACTABLE_INTENT_STATUSES = ["expired", "rejected", "failed", "applied", "stale"] as const;
export const ASSISTANT_DELETABLE_RECEIPT_STATUSES = ["applied", "rejected", "expired", "failed", "stale"] as const;
export const RUN_GRACE_MS = ASSISTANT_LIMITS.runGraceMs;
