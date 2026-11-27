'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

const SLIDER = 'w-full accent-hud-accent disabled:opacity-50';

export function RangeRow({
    id,
    label,
    value,
    range,
    onChange,
}: {
    id: string;
    label: string;
    value: number;
    range: { min: number; max: number; step: number; disabled?: boolean };
    onChange: (v: number) => void;
}) {
    return (
        <div>
            <Label htmlFor={id}>{label}</Label>
            <Slider
                id={id}
                {...range}
                value={value}
                onValueChange={(v) => onChange(v)}
                className={SLIDER}
            />
        </div>
    );
}
