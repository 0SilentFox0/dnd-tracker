export type FlowPart = "when" | "if" | "then" | "limits";

export const FLOW_BORDER: Record<FlowPart, string> = {
  when: "border-[color:var(--flow-when)]",
  if: "border-[color:var(--flow-if)]",
  then: "border-[color:var(--flow-then)]",
  limits: "border-[color:var(--flow-limit)]",
};

export const FLOW_TEXT: Record<FlowPart, string> = {
  when: "text-[color:var(--flow-when)]",
  if: "text-[color:var(--flow-if)]",
  then: "text-[color:var(--flow-then)]",
  limits: "text-[color:var(--flow-limit)]",
};
