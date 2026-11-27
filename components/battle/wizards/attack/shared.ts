import type { useAttackWizard } from '@/lib/hooks/battle';

export type AttackWizardModel = ReturnType<typeof useAttackWizard>;

export const btn =
    'hud-sc flex h-12 items-center justify-center gap-2.5 border text-base font-bold tracking-[.04em]';

export const primaryBtn =
    'border-hud-accent-2 bg-hud-accent text-hud-accent-ink';
