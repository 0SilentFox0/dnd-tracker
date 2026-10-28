"use client";

import { type FormEvent, useState } from "react";

import { HudCard } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { API_TOKEN_SCOPE_LABELS, type ApiTokenScope } from "@/lib/constants/ai";
import { useConfirm } from "@/lib/hooks/common";
import type { ApiTokenSummary, CreateApiTokenInput, CreatedApiToken } from "@/types/ai";

interface ApiTokenListActions {
  onCreate: (input: CreateApiTokenInput) => Promise<CreatedApiToken | null>;
  onRevoke: (id: string) => void;
}

interface ApiTokenListProps {
  tokens: ApiTokenSummary[];
  scopes: readonly ApiTokenScope[];
  actions: ApiTokenListActions;
}

export function ApiTokenList({ tokens, scopes, actions }: ApiTokenListProps) {
  const confirm = useConfirm();

  const initialScopes = scopes.slice(0, 1);

  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");

  const [created, setCreated] = useState<CreatedApiToken | null>(null);

  const [pending, setPending] = useState(false);

  const [selected, setSelected] = useState<ApiTokenScope[]>(initialScopes);

  const close = () => {
    setOpen(false);
    setName("");
    setSelected(initialScopes);
    setCreated(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);

    const result = await actions.onCreate({ name: name.trim(), scopes: selected });

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
            <div className="mt-1 flex flex-wrap gap-1">
              {token.scopes.map((s) => (
                <Badge key={s} variant="outline">
                  {API_TOKEN_SCOPE_LABELS[s]}
                </Badge>
              ))}
            </div>
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
        description={created ? "Скопіюйте токен зараз — пізніше його не буде видно." : "Дайте токену назву й оберіть права. Змінити права пізніше не можна — лише відкликати й створити новий."}
        footer={
          created ? (
            <>
              <Button variant="ghost" onClick={() => void navigator.clipboard.writeText(created.token)}>
                Скопіювати
              </Button>
              <Button onClick={close}>Готово</Button>
            </>
          ) : (
            <Button type="submit" form="api-token-form" disabled={pending || !name.trim() || selected.length === 0}>
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
            <fieldset className="space-y-2 pt-2">
              <legend className="text-sm text-hud-muted">Права</legend>
              {scopes.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-hud-ink">
                  <Checkbox
                    checked={selected.includes(scope)}
                    onCheckedChange={(on) => setSelected((prev) => (on === true ? [...prev, scope] : prev.filter((s) => s !== scope)))}
                    aria-label={API_TOKEN_SCOPE_LABELS[scope]}
                  />
                  {API_TOKEN_SCOPE_LABELS[scope]}
                </label>
              ))}
            </fieldset>
          </form>
        )}
      </ResponsiveDialog>
    </div>
  );
}
