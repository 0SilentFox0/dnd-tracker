'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { Checkbox } from '@/components/ui/checkbox';
import { isAssistantHandoffHref } from '@/lib/schemas/assistant-handoff';
import type { HandoffResult } from '@/types/assistant';

type NoteChoice = { canonicalKey: string; title: string };
type Props = {
    handoff: HandoffResult;
    notes?: readonly NoteChoice[];
    onSelectNotes?: (keys: string[]) => void;
};

function SourceNotePicker({
    notes,
    onSelect,
}: {
    notes: readonly NoteChoice[];
    onSelect: (keys: string[]) => void;
}) {
    const t = useTranslations('ai');

    const [selected, setSelected] = useState<string[]>([]);

    const options = notes.slice(0, 5);

    const current = selected.filter((key) =>
        options.some((n) => n.canonicalKey === key)
    );

    return (
        <fieldset className="space-y-2">
            <legend>{t('handoff.notesLegend')}</legend>
            <p className="text-sm">{t('handoff.notesHint')}</p>
            {options.map((note) => (
                <label
                    key={note.canonicalKey}
                    className="flex items-center gap-2"
                >
                    <Checkbox
                        checked={current.includes(note.canonicalKey)}
                        onCheckedChange={(v) =>
                            setSelected((previous) =>
                                v === true
                                    ? [...previous, note.canonicalKey]
                                    : previous.filter(
                                          (k) => k !== note.canonicalKey
                                      )
                            )
                        }
                    />
                    {note.title}
                </label>
            ))}
            <HudButton
                type="button"
                disabled={!current.length}
                className="underline disabled:opacity-50"
                onClick={() => onSelect(current)}
            >
                {t('handoff.useNotes')}
            </HudButton>
        </fieldset>
    );
}

/** Navigation and deliberate selection only; it never confirms or runs a mutation. */
export function AssistantHandoff({
    handoff,
    notes = [],
    onSelectNotes,
}: Props) {
    const t = useTranslations('ai');

    if (!isAssistantHandoffHref(handoff.href))
        return <p role="alert">{t('handoff.unavailable')}</p>;

    return (
        <section
            aria-label={t('handoff.ariaLabel')}
            className="space-y-3 rounded border p-3"
        >
            <p>{handoff.reason}</p>
            <Link className="underline" href={handoff.href}>
                {t('handoff.open')}
            </Link>
            {notes.length > 0 && onSelectNotes && (
                <SourceNotePicker
                    key={`${handoff.href}:${notes.map((n) => n.canonicalKey).join(',')}`}
                    notes={notes}
                    onSelect={onSelectNotes}
                />
            )}
        </section>
    );
}
