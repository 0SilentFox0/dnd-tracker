import type { Translator } from "@/lib/i18n/translator";
import type { StepStatus } from "@/lib/onboarding/progress";
import type { OnboardingRole } from "@/lib/onboarding/types";

export function stepText(t: Translator, role: OnboardingRole, step: Pick<StepStatus, "id" | "variant">): { title: string; description: string } {
  const base = `checklist.${role}.${step.id}`;

  const { variant } = step;

  return {
    title: t(`${base}.title`),
    description: variant ? t(`${base}.description${variant.name.charAt(0).toUpperCase()}${variant.name.slice(1)}`, variant.params) : t(`${base}.description`),
  };
}
