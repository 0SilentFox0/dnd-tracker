import type { SelectOption, SelectOptionGroup } from '@/components/ui/select-field';

interface MockProps {
    id?: string;
    'aria-label'?: string;
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    options?: SelectOption[];
    groups?: SelectOptionGroup[];
    disabled?: boolean;
    allowNone?: boolean;
    noneLabel?: string;
}

const renderOption = (o: SelectOption) => (
    <option key={o.value} value={o.value}>
        {o.label}
    </option>
);

/** Native stand-in for the Radix SelectField (happy-dom cannot drive Radix popovers). */
export function SelectField({
    id,
    'aria-label': ariaLabel,
    value,
    onValueChange,
    placeholder,
    options = [],
    groups,
    disabled,
    allowNone,
    noneLabel,
}: MockProps) {
    return (
        <select
            id={id}
            aria-label={ariaLabel}
            value={value}
            disabled={disabled}
            onChange={(e) => onValueChange(e.target.value)}
        >
            {(allowNone || !value) && (
                <option value="">{allowNone ? noneLabel : placeholder}</option>
            )}
            {groups?.length
                ? groups.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                          {g.options.map(renderOption)}
                      </optgroup>
                  ))
                : options.map(renderOption)}
        </select>
    );
}
