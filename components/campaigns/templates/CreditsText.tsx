import { cn } from '@/lib/utils';

export function CreditsText({
    credits,
    className,
}: {
    credits: string;
    className?: string;
}) {
    return (
        <p
            className={cn(
                'text-xs leading-5 break-words whitespace-pre-line text-hud-muted',
                className
            )}
        >
            {credits}
        </p>
    );
}
