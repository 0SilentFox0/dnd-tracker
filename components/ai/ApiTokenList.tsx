"use client";

import { type FormEvent, useState } from "react";

import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useConfirm } from "@/lib/hooks/common";
import type { ApiTokenSummary, CreatedApiToken } from "@/types/ai";

interface ApiTokenListActions {
  onCreate: (name: string) => Promise<CreatedApiToken | null>;
  onRevoke: (id: string) => void;
}

interface ApiTokenListProps {
  tokens: ApiTokenSummary[];
  actions: ApiTokenListActions;
}

export function ApiTokenList({ tokens, actions }: ApiTokenListProps) {
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");

  const [created, setCreated] = useState<CreatedApiToken | null>(null);

  const [pending, setPending] = useState(false);

  const close = () => {
    setOpen(false);
    setName("");
    setCreated(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await actions.onCreate(name.trim());

    setPending(false);

    if (result) setCreated(result);
  };

  const revoke = async (token: ApiTokenSummary) => {
    const ok = await confirm({ title: "Відкликати токен?", description: `«${token.name}» перестане працювати.`, confirmLabel: "Відкликати", destructive: true });

    if (ok) actions.onRevoke(token.id);
  };

  return (
    <div className="space-y-3">
      {tokens.map((token) => (
        <HudCard key={token.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="font-semibold text-hud-ink">{token.name}</p>
            <p className="text-sm text-hud-muted">
              {token.prefix}… · {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString("uk") : "ще не використовувався"}
            </p>
          </div>
          <Button variant="ghost" onClick={() => void revoke(token)}>
            Відкликати
          </Button>
        </HudCard>
      ))}
      <Button onClick={() => setOpen(true)}>Створити токен</Button>
      <ResponsiveDialog
        hud
        open={open}
        onOpenChange={(next) => !next && close()}
        title={created ? "Токен створено" : "Новий токен"}
        description={created ? "Скопіюйте токен зараз — пізніше його не буде видно." : "Дайте токену назву, щоб відрізняти клієнтів."}
        footer={
          created ? (
            <>
              <Button variant="ghost" onClick={() => void navigator.clipboard.writeText(created.token)}>
                Скопіювати
              </Button>
              <Button onClick={close}>Готово</Button>
            </>
          ) : (
            <Button type="submit" form="api-token-form" disabled={pending || !name.trim()}>
              Створити
            </Button>
          )
        }
      >
        {created ? (
          <code className="block break-all rounded-md bg-hud-panel p-3 text-sm text-hud-ink">{created.token}</code>
        ) : (
          <form id="api-token-form" onSubmit={(e) => void submit(e)} className="space-y-1">
            <label htmlFor="api-token-name" className="text-sm text-hud-muted">
              Назва
            </label>
            <Input id="api-token-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" />
          </form>
        )}
      </ResponsiveDialog>
    </div>
  );
}
