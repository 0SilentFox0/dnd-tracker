'use client';

import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { useTranslator } from '@/lib/i18n/use-translator';

export function SpellRangeInput({
    id,
    value,
    onCommit,
}: {
    id: string;
    value: number | undefined;
    onCommit: (value: number | undefined) => void;
}) {
    const t = useTranslator();

    const [draft, setDraft] = useState<string | null>(null);

    const commit = () => {
        if (draft === null) return;

        setDraft(null);

        const n = parseInt(draft);

        onCommit(
            Number.isFinite(n) ? Math.max(5, Math.min(600, n)) : undefined
        );
    };

    return (
        <Input
            id={id}
            type="number"
            min={5}
            max={600}
            step={5}
            placeholder={t('spellEditor.power.rangePlaceholder')}
            value={draft ?? value ?? ''}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            className="w-40"
        />
    );
}

