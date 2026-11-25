'use client';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export function CategoryChip({
    label,
    count,
    checked,
    disabled,
    onChange,
}: {
    label: string;
    count: number;
    checked: boolean;
    disabled?: boolean;
    onChange: (on: boolean) => void;
}) {
    return (
        <label
            className={cn(
                'inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-sm transition-colors has-[:focus-visible]:ring-2',
                checked
                    ? 'border-hud-gold bg-hud-panel-2 text-hud-ink'
                    : 'border-hud-rule text-hud-muted hover:border-hud-muted',
                disabled && 'cursor-not-allowed opacity-50'
            )}
        >
            <Checkbox
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onCheckedChange={(v) => onChange(v === true)}
            />
            {`${label} (${count})`}
        </label>
    );
}
