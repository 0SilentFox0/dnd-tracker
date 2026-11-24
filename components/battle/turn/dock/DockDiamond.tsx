import { cn } from '@/lib/utils';

export function DockDiamond({
    label,
    spent,
    spentLabel,
}: {
    label: string;
    spent: boolean;
    spentLabel: string;
}) {
    return (
        <span
            data-state={spent ? 'spent' : 'ready'}
            className={cn(
                'flex min-w-12 flex-col items-center gap-1.5 text-[11px] leading-none',
                spent ? 'text-[var(--hud-muted)]' : 'text-[var(--ink)]'
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'size-3.5 rotate-45 rounded-[3px] border',
                    spent
                        ? 'border-white/25 bg-white/10'
                        : 'border-[var(--gold)] bg-[var(--gold)]'
                )}
            />
            <span className="hud-sc tracking-[.06em]">{label}</span>
            {spent && <span className="font-sans italic">{spentLabel}</span>}
        </span>
    );
}
