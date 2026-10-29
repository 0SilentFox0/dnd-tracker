"use client";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { useAssistantContext } from "@/lib/hooks/ai/useAssistantContext";

type Context = ReturnType<typeof useAssistantContext>;

function NotesPicker({ context }: { context: Context }) {
  return (
    <fieldset className="space-y-1">
      <legend>Лише явно вибрані примітки: до 5, до 3000 символів кожна</legend>
      <p>Початковий вибір порожній. Відсутність вибору не означає «усі».</p>
      {context.notes.map((note) => (
        <label key={note.canonicalKey} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={context.selected.includes(note.canonicalKey)}
            disabled={context.selected.length >= 5 && !context.selected.includes(note.canonicalKey)}
            onChange={(event) =>
              context.selectNotes(event.target.checked ? [...context.selected, note.canonicalKey] : context.selected.filter((key) => key !== note.canonicalKey))
            }
          />
          {note.title}
        </label>
      ))}
      {context.nextOffset !== null && (
        <Button variant="outline" onClick={() => void context.loadNotes(context.nextOffset ?? 0)}>
          Наступні джерела
        </Button>
      )}
      <Button variant="outline" onClick={() => context.selectNotes([])}>
        Очистити вибір приміток
      </Button>
    </fieldset>
  );
}

function DisclosureDetails({ context, disclosure }: { context: Context; disclosure: NonNullable<Context["disclosure"]> }) {
  return (
    <div className="space-y-2">
      <p className="break-words">
        Провайдер: {disclosure.provider} · Модель: {disclosure.model}
      </p>
      <ul>
        {disclosure.labels.map((label) => (
          <li className="break-words" key={label}>
            {label}
          </li>
        ))}
      </ul>
      <p>
        {disclosure.characters}/40000 символів системного контексту; {disclosure.truncated ? "частину необов’язкових даних скорочено" : "без скорочення"}.
      </p>
      <p>Історія: до {disclosure.historyLimit} повідомлень. Інструменти можуть читати актуальні дозволені дані за запитом.</p>
      <p>
        Явно вибрані source notes: {disclosure.sourceNoteCount}. {context.selected.join(", ")}
      </p>
      {!disclosure.focusAvailable && <p role="alert">Фокус недоступний: сутність видалена або недоступна у кампанії.</p>}
      <p>Генерація зображень платна і вимагає окремого підтвердження. Грошова оцінка не обчислюється.</p>
    </div>
  );
}

export function AssistantContextDisclosure({ context, onSend }: { context: Context; onSend: (text: string) => unknown }) {
  return (
    <div className="space-y-2 text-sm">
      <Button variant="outline" onClick={() => void context.loadNotes()}>
        Вибрати source notes ({context.selected.length}/5)
      </Button>
      {context.notesOpen && <NotesPicker context={context} />}
      {context.error && <p role="alert">{context.error}</p>}
      <ResponsiveDialog
        open={context.pendingText !== null}
        onOpenChange={(open) => {
          if (!open) context.cancel();
        }}
        title="Перед надсиланням провайдеру"
        description="Перевірте фактично вибраний контекст. Приватні дані передаються лише після вашої явної дії."
        footer={
          <>
            <Button variant="outline" onClick={context.cancel}>
              Скасувати
            </Button>
            <Button disabled={!context.canSend || context.busy} onClick={() => void context.approve(onSend)}>
              Надіслати обраний контекст
            </Button>
          </>
        }
      >
        {context.busy && <p role="status">Перевіряємо доступний контекст…</p>}
        {context.disclosure && <DisclosureDetails context={context} disclosure={context.disclosure} />}
        {context.error && <p role="alert">{context.error}</p>}
        {!context.busy && !context.canSend && (
          <Button variant="outline" onClick={() => void context.requestSend(context.pendingText ?? "")}>
            Оновити перегляд контексту
          </Button>
        )}
      </ResponsiveDialog>
    </div>
  );
}
