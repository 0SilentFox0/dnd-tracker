'use client';

import { useTranslations } from 'next-intl';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { SelectField, type SelectOption } from '@/components/ui/select-field';

export type TableRow = { max: number; id: string };

interface TableRowsEditorProps {
    title: string;
    idLabel: string;
    rows: TableRow[];
    options: SelectOption[];
    onChange: (rows: TableRow[]) => void;
    error?: string;
}

export function TableRowsEditor({
    title,
    idLabel,
    rows,
    options,
    onChange,
    error,
}: TableRowsEditorProps) {
    const t = useTranslations('wfrpCreation.editor');

    const patch = (i: number, p: Partial<TableRow>) =>
        onChange(rows.map((r, k) => (k === i ? { ...r, ...p } : r)));

    const add = () =>
        onChange([
            ...rows,
            {
                max: Math.min(100, (rows[rows.length - 1]?.max ?? 0) + 10),
                id: '',
            },
        ]);

    return (
        <section aria-label={title} className="space-y-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                    <BoundedNumberInput
                        aria-label={`${t('max')} ${i + 1}`}
                        className="min-h-11 w-20 text-center"
                        value={row.max}
                        min={1}
                        max={100}
                        onCommit={(max) => patch(i, { max })}
                    />
                    <SelectField
                        aria-label={`${idLabel} ${i + 1}`}
                        className="min-w-0 flex-1"
                        triggerClassName="min-h-11 w-full"
                        value={row.id}
                        onValueChange={(id) => patch(i, { id })}
                        options={options}
                        placeholder={idLabel}
                    />
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-11"
                        aria-label={`${t('removeRow')} ${i + 1}`}
                        onClick={() => onChange(rows.filter((_, k) => k !== i))}
                    >
                        ×
                    </Button>
                </div>
            ))}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={add}
            >
                {t('addRow')}
            </Button>
        </section>
    );
}
