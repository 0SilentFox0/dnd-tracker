import { useId } from 'react';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Label } from '@/components/ui/label';

interface NumberFieldProps {
    label: string;
    value: number;
    range: [min: number, max: number];
    onCommit: (value: number) => void;
    disabled?: boolean;
    description?: string;
    decimal?: boolean;
}

export function NumberField({
    label,
    value,
    range,
    onCommit,
    disabled,
    description,
    decimal,
}: NumberFieldProps) {
    const id = useId();

    return (
        <div className="@container">
            <div className="ds-setting-row">
                <div className="flex flex-col gap-1">
                    <Label htmlFor={id} className="mb-0">
                        {label}
                    </Label>
                    {description && (
                        <p className="text-sm text-hud-muted">{description}</p>
                    )}
                </div>
                <BoundedNumberInput
                    id={id}
                    value={value}
                    min={range[0]}
                    max={range[1]}
                    onCommit={onCommit}
                    disabled={disabled}
                    decimal={decimal}
                    className="w-28"
                />
            </div>
        </div>
    );
}
