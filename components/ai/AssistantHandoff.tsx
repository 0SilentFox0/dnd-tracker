"use client";

import { useState } from "react";
import Link from "next/link";

import { isAssistantHandoffHref } from "@/lib/schemas/assistant-handoff";
import type { HandoffResult } from "@/types/assistant";

type NoteChoice = { canonicalKey: string; title: string };
type Props = { handoff: HandoffResult; notes?: readonly NoteChoice[]; onSelectNotes?: (keys: string[]) => void };

function SourceNotePicker({ notes, onSelect }: { notes: readonly NoteChoice[]; onSelect: (keys: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);

  const options = notes.slice(0, 5);

  const current = selected.filter(key => options.some(n => n.canonicalKey === key));

  return <fieldset className="space-y-2">
    <legend>Виберіть примітки джерела для передачі AI</legend>
    <p className="text-sm">Передаємо лише явно вибрані примітки. За замовчуванням нічого не вибрано.</p>
    {options.map(note => <label key={note.canonicalKey} className="flex items-center gap-2">
      <input type="checkbox" checked={current.includes(note.canonicalKey)} onChange={event => setSelected(previous => event.target.checked ? [...previous, note.canonicalKey] : previous.filter(k => k !== note.canonicalKey))} />
      {note.title}
    </label>)}
    <button type="button" disabled={!current.length} className="underline disabled:opacity-50" onClick={() => onSelect(current)}>Використати вибрані примітки для AI</button>
  </fieldset>;
}

/** Navigation and deliberate selection only; it never confirms or runs a mutation. */
export function AssistantHandoff({ handoff, notes = [], onSelectNotes }: Props) {
  if (!isAssistantHandoffHref(handoff.href)) return <p role="alert">Недоступний перехід</p>;

  return <section aria-label="Продовжити у застосунку" className="space-y-3 rounded border p-3">
    <p>{handoff.reason}</p>
    <Link className="underline" href={handoff.href}>Відкрити у застосунку</Link>
    {notes.length > 0 && onSelectNotes && <SourceNotePicker key={`${handoff.href}:${notes.map(n => n.canonicalKey).join(",")}`} notes={notes} onSelect={onSelectNotes} />}
  </section>;
}
