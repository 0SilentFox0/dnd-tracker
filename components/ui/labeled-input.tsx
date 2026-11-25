import * as React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
    label: string;
    htmlFor?: string;
    required?: boolean;
    description?: string;
    error?: string;
    labelExtra?: React.ReactNode;
    labelClassName?: string;
    className?: string;
    children: React.ReactNode;
}

export function FormField({
    label,
    htmlFor,
    required = false,
    description,
    error,
    labelExtra,
    labelClassName,
    className,
    children,
}: FormFieldProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <Label
                htmlFor={htmlFor}
                className={cn('mb-0', labelClassName)}
            >
                {label}
                {labelExtra}
                {required && <span className="ml-1 text-hud-crimson-fg">*</span>}
            </Label>
            {children}
            {description && (
                <p className="text-sm text-hud-muted">{description}</p>
            )}
            {error && <p role="alert" className="text-sm text-hud-crimson-fg">
                    {error}
                </p>}
        </div>
    );
}

interface LabeledInputProps
    extends React.ComponentProps<typeof Input>,
        Pick<
            FormFieldProps,
            'label' | 'labelExtra' | 'description' | 'error' | 'labelClassName'
        > {
    required?: boolean;
    containerClassName?: string;
}

export function LabeledInput({
    label,
    labelExtra,
    description,
    error,
    required = false,
    containerClassName,
    labelClassName,
    id,
    className,
    ...inputProps
}: LabeledInputProps) {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <FormField
            label={label}
            htmlFor={inputId}
            required={required}
            description={description}
            error={error}
            labelExtra={labelExtra}
            labelClassName={labelClassName}
            className={containerClassName}
        >
            <Input
                id={inputId}
                required={required}
                aria-invalid={error ? true : undefined}
                className={className}
                {...inputProps}
            />
        </FormField>
    );
}
