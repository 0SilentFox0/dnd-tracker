import type { z } from "zod";

import type { StepStatus } from "@/lib/onboarding/progress";
import type { ChecklistState, OnboardingFlags, OnboardingRole } from "@/lib/onboarding/types";
import type { resetOnboardingSchema, setOnboardingFlagSchema } from "@/lib/schemas/onboarding";

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

export type SetFlagBody = z.input<typeof setOnboardingFlagSchema>;

export type ResetScope = z.infer<typeof resetOnboardingSchema>["scope"];
