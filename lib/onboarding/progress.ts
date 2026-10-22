import { DM_STEPS, PLAYER_STEPS } from "@/lib/onboarding/checklists";
import { CHECKLIST_HIDDEN, HIDE_ALL_HINTS_KEY, hintKey } from "@/lib/onboarding/flag-keys";
import type { ChecklistState, OnboardingFacts, OnboardingFlags, OnboardingRole, OnboardingStep, WhatsNewEntry } from "@/lib/onboarding/types";

export const CHECKLIST_COLLAPSED_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StepStatus {
  id: string;
  title: string;
  description: string;
  href: string;
  helpSlug?: string;
  optional: boolean;
  informational: boolean;
  done: boolean;
}

function statuses<F>(steps: OnboardingStep<F>[], facts: F, campaignId: string): StepStatus[] {
  return steps.map((s) => ({
    id: s.id,
    title: s.title,
    description: typeof s.description === "function" ? s.description(facts) : s.description,
    href: s.href(campaignId),
    ...(s.helpSlug && { helpSlug: s.helpSlug }),
    optional: !!s.optional,
    informational: !!s.informational,
    done: s.isDone(facts),
  }));
}

export function checklistProgress(facts: OnboardingFacts, campaignId: string) {
  const steps = facts.role === "dm" ? statuses(DM_STEPS, facts.dm, campaignId) : statuses(PLAYER_STEPS, facts.player, campaignId);

  const required = steps.filter((s) => !s.optional);

  const requiredDone = required.filter((s) => s.done).length;

  return { steps, requiredDone, requiredTotal: required.length, allRequiredDone: requiredDone === required.length };
}

export function checklistState(flag: string | null | undefined, allRequiredDone: boolean, now: Date): ChecklistState {
  if (flag === CHECKLIST_HIDDEN) return "hidden";

  if (!allRequiredDone) return "open";

  const completedAt = flag ? Date.parse(flag) : NaN;

  if (Number.isNaN(completedAt)) return "collapsed";

  return now.getTime() - completedAt >= CHECKLIST_COLLAPSED_DAYS * DAY_MS ? "hidden" : "collapsed";
}

export function visibleWhatsNew(entries: WhatsNewEntry[], audiences: OnboardingRole[]): WhatsNewEntry[] {
  return entries.filter((e) => e.audience === "all" || audiences.includes(e.audience));
}

export function unseenWhatsNew(entries: WhatsNewEntry[], audiences: OnboardingRole[], lastSeenId: string | null | undefined): WhatsNewEntry[] {
  const seenIndex = entries.findIndex((e) => e.id === lastSeenId);

  // невідомий id (запис прибрали) — вважаємо все побаченим, а не показуємо всю історію
  if (seenIndex < 0) return [];

  return visibleWhatsNew(entries.slice(0, seenIndex), audiences);
}

export function isHintHidden(id: string, flags: OnboardingFlags): boolean {
  return HIDE_ALL_HINTS_KEY in flags || hintKey(id) in flags;
}
