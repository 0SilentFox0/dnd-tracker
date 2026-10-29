"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { AI_MODELS, AI_PROVIDER_LABELS, type AiProvider } from "@/lib/constants/ai";
import type { AiCredentialSummary } from "@/types/ai";

interface AiProviderCardActions {
  onSave: (apiKey: string, model: string | null) => void;
  onModel: (model: string | null) => void;
  onDelete: () => void;
}

interface AiProviderCardProps {
  provider: AiProvider;
  credential: AiCredentialSummary | null;
  actions: AiProviderCardActions;
  pending: boolean;
}

export function AiProviderCard({ provider, credential, actions, pending }: AiProviderCardProps) {
  const t = useTranslations("ai");

  const tc = useTranslations("common");

  const [apiKey, setApiKey] = useState("");

  const keyId = `ai-key-${provider}`;

  const modelId = `ai-model-${provider}`;

  const trimmed = apiKey.trim();

  return (
    <HudCard className="space-y-3 p-4">
      <h3 className="font-semibold text-hud-ink">{AI_PROVIDER_LABELS[provider]}</h3>
      {credential && <p className="text-sm text-hud-muted">…{credential.last4}</p>}
      <div className="space-y-1">
        <label htmlFor={keyId} className="text-sm text-hud-muted">
          {t("provider.apiKey")}
        </label>
        <Input id={keyId} type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={credential ? t("provider.replacePlaceholder") : t("provider.pastePlaceholder")} />
      </div>
      <div className="space-y-1">
        <label htmlFor={modelId} className="text-sm text-hud-muted">
          {t("provider.defaultModel")}
        </label>
        <SelectField
          id={modelId}
          value={credential?.defaultModel ?? ""}
          onValueChange={(v) => actions.onModel(v || null)}
          options={AI_MODELS[provider].map((m) => ({ value: m.id, label: m.label }))}
          allowNone
          noneLabel={t("provider.automatic")}
          disabled={!credential || pending}
        />
      </div>
      <div className="flex gap-2">
        <Button
          disabled={pending || trimmed.length < 10}
          onClick={() => {
            actions.onSave(trimmed, credential?.defaultModel ?? null);
            setApiKey("");
          }}
        >
          {t("provider.verifyAndSave")}
        </Button>
        {credential && (
          <Button variant="ghost" disabled={pending} onClick={actions.onDelete}>
            {tc("actions.delete")}
          </Button>
        )}
      </div>
    </HudCard>
  );
}
