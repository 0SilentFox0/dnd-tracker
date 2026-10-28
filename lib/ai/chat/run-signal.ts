import { AI_LIMITS } from "@/lib/constants/ai";

export function createRunSignal(clientSignal?: AbortSignal, remainingMs: number = AI_LIMITS.requestDeadlineMs) {
  const deadline = new AbortController();

  const timer = setTimeout(() => deadline.abort(new DOMException("Час запиту вичерпано", "TimeoutError")), Math.max(0, remainingMs));

  const signal = AbortSignal.any([deadline.signal, ...(clientSignal ? [clientSignal] : [])]);

  return { signal, dispose: () => clearTimeout(timer) };
}
