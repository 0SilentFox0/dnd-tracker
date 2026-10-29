import type { LogLine } from "@/types/text";

export interface ConversionIssue {
  severity: "loss" | "behavior";
  message: LogLine;
}
