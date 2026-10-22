import type { StepStatus } from "@/lib/onboarding/progress";
import type { ChecklistState, OnboardingFlags, OnboardingRole } from "@/lib/onboarding/types";

export interface OnboardingFlagsResponse {
  flags: OnboardingFlags;
  audiences: OnboardingRole[];
}

export interface CampaignOnboardingResponse {
  role: OnboardingRole;
  state: ChecklistState;
  steps: StepStatus[];
  requiredDone: number;
  requiredTotal: number;
}

export type SetFlagBody = { key: string; value?: string | null };

export type ResetScope = "hints" | "checklists";
