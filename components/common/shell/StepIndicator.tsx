import { Check } from 'lucide-react';

import { HudButton } from '@/components/hud/HudButton';
import { cn } from '@/lib/utils';

export function StepIndicator({
    steps,
    current,
    label,
    max = current,
    onSelect,
    details,
}: {
    steps: string[];
    current: number;
    label: string;
    max?: number;
    onSelect?: (i: number) => void;
    details?: (string | undefined)[];
}) {
    return (
        <ol
            aria-label={label}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
        >
            {steps.map((step, i) => {
                const done = i < max && i !== current,
                    active = i === current,
                    reachable = i <= max;

                const body = (
                    <>
                        <span
                            className={cn(
                                'flex size-5 shrink-0 items-center justify-center rounded-full border text-xs',
                                active ? 'border-hud-accent' : 'border-hud-rule'
                            )}
                        >
                            {done ? (
                                <Check className="size-3" aria-hidden />
                            ) : (
                                i + 1
                            )}
                        </span>
                        <span className="min-w-0 text-left">
                            {step}
                            {details?.[i] && (
                                <span
                                    data-slot="step-detail"
                                    className="block truncate text-xs text-hud-muted"
                                >
                                    {details[i]}
                                </span>
                            )}
                        </span>
                    </>
                );

                return (
                    <li
                        key={step}
                        aria-current={active ? 'step' : undefined}
                        data-state={done ? 'done' : active ? 'current' : 'todo'}
                        className={cn(
                            active
                                ? 'text-hud-accent-fg'
                                : done
                                  ? 'text-hud-ink'
                                  : 'text-hud-muted'
                        )}
                    >
                        {onSelect && reachable ? (
                            <HudButton
                                className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 hover:bg-hud-raised"
                                onClick={() => onSelect(i)}
                            >
                                {body}
                            </HudButton>
                        ) : (
                            <span
                                aria-disabled={onSelect ? true : undefined}
                                className="flex items-center gap-1.5 px-1 py-0.5"
                            >
                                {body}
                            </span>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
