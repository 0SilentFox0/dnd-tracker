import type { useAttackWizard } from '@/lib/hooks/battle';

export type AttackWizardModel = ReturnType<typeof useAttackWizard>;

export const btn =
    'hud-sc flex h-[52px] items-center justify-center gap-2.5 border text-base font-bold tracking-[.04em]';

export const primaryBtn = 'border-hud-crimson-2 bg-hud-crimson text-hud-crimson-ink';
