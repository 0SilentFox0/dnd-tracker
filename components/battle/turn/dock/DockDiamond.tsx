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
            className="flex min-w-10 flex-col items-center gap-1.5 text-[10px] leading-none text-[#c7f2dc] max-md:min-w-0 max-md:gap-1 max-md:text-[11px]"
        >
            <span
                aria-hidden
                className={cn(
                    'size-3.5 rotate-45 border shadow-[0_1px_3px_#000]',
                    spent
                        ? 'border-black/40 bg-[#7d8581]'
                        : 'border-[#3bd38a] bg-[#167a50]'
                )}
            />
            <span className="hud-sc tracking-[.07em] uppercase">
                {label}
            </span>
            {spent && <span className="sr-only">{spentLabel}</span>}
        </span>
    );
}
