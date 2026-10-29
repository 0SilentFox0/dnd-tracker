"use client";

import { type FormEvent, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { AssistantPolicyControl } from "./AssistantPolicyControl";

import { HudCard } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { type ApiTokenScope, tokenScopeKey } from "@/lib/constants/ai";
import { useConfirm } from "@/lib/hooks/common";
import type { ApiTokenSummary, CreateApiTokenInput, CreatedApiToken } from "@/types/ai";

interface ApiTokenListActions {
  onCreate: (input: CreateApiTokenInput) => Promise<CreatedApiToken | null>;
  onRevoke: (id: string) => void;
}

interface ApiTokenListProps {
  campaignId?: string;
  tokens: ApiTokenSummary[];
  scopes: readonly ApiTokenScope[];
  actions: ApiTokenListActions;
}

export function ApiTokenList({ campaignId, tokens, scopes, actions }: ApiTokenListProps) {
  const t = useTranslations("ai");

  const tc = useTranslations("common");

  const format = useFormatter();

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
    const ok = await confirm({ title: t("tokens.revokeConfirm.title"), description: t("tokens.revokeConfirm.description", { name: token.name }), confirmLabel: t("tokens.revoke"), destructive: true });

    if (ok) actions.onRevoke(token.id);
  };

  return (
    <div className="space-y-3">
      {tokens.map((token) => (
        <HudCard key={token.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="font-semibold text-hud-ink">{token.name}</p>
            <p className="text-sm text-hud-muted">
              {token.prefix}… · {token.lastUsedAt ? format.dateTime(new Date(token.lastUsedAt), { dateStyle: "short", timeStyle: "short" }) : t("tokens.neverUsed")}
            </p>
            {campaignId && <AssistantPolicyControl key={token.id} campaignId={campaignId} target="token" id={token.id} executionMode={token.executionMode} />}
            <div className="mt-1 flex flex-wrap gap-1">
              {token.scopes.map((s) => (
                <Badge key={s} variant="outline">
                  {t(`tokenScopes.${tokenScopeKey(s)}`)}
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="ghost" onClick={() => void revoke(token)}>
            {t("tokens.revoke")}
          </Button>
        </HudCard>
      ))}
      <Button onClick={() => setOpen(true)}>{t("tokens.create")}</Button>
      <ResponsiveDialog
        hud
        open={open}
        onOpenChange={(next) => !next && close()}
        title={created ? t("tokens.dialog.createdTitle") : t("tokens.dialog.newTitle")}
        description={created ? t("tokens.dialog.createdDescription") : t("tokens.dialog.newDescription")}
        footer={
          created ? (
            <>
              <Button variant="ghost" onClick={() => void navigator.clipboard.writeText(created.token)}>
                {t("tokens.dialog.copy")}
              </Button>
              <Button onClick={close}>{t("tokens.dialog.done")}</Button>
            </>
          ) : (
            <Button type="submit" form="api-token-form" disabled={pending || !name.trim() || selected.length === 0}>
              {tc("actions.create")}
            </Button>
          )
        }
      >
        {created ? (
          <code className="block break-all rounded-md bg-hud-panel p-3 text-sm text-hud-ink">{created.token}</code>
        ) : (
          <form id="api-token-form" onSubmit={(e) => void submit(e)} className="space-y-1">
            <label htmlFor="api-token-name" className="text-sm text-hud-muted">
              {t("tokens.dialog.name")}
            </label>
            <Input id="api-token-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="off" />
            <fieldset className="space-y-2 pt-2">
              <legend className="text-sm text-hud-muted">{t("tokens.dialog.scopes")}</legend>
              {scopes.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-hud-ink">
                  <Checkbox
                    checked={selected.includes(scope)}
                    onCheckedChange={(on) => setSelected((prev) => (on === true ? [...prev, scope] : prev.filter((s) => s !== scope)))}
                    aria-label={t(`tokenScopes.${tokenScopeKey(scope)}`)}
                  />
                  {t(`tokenScopes.${tokenScopeKey(scope)}`)}
                </label>
              ))}
            </fieldset>
          </form>
        )}
      </ResponsiveDialog>
    </div>
  );
}
