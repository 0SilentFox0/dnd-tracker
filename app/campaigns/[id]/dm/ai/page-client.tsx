"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

import { AiInstructionsEditor, ApiTokenList } from "@/components/ai";
import { QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { API_TOKEN_SCOPES, type ApiTokenScope, CONTENT_SCOPES } from "@/lib/constants/ai";
import { useAiSettings, useApiTokens } from "@/lib/hooks/ai";

const snippets = (origin: string) => [
  {
    label: "Claude Desktop",
    json: { mcpServers: { "dnd-tracker": { command: "npx", args: ["-y", "mcp-remote", `${origin}/api/mcp`, "--header", "Authorization: Bearer ${DNDT_TOKEN}"], env: { DNDT_TOKEN: "<ваш токен>" } } } },
  },
  {
    label: "Cursor",
    json: { mcpServers: { "dnd-tracker": { url: `${origin}/api/mcp`, headers: { Authorization: "Bearer <ваш токен>" } } } },
  },
];

const subscribeNothing = () => () => {};

function TokensPanel({ campaignId, scopes }: { campaignId: string; scopes: readonly ApiTokenScope[] }) {
  const tokens = useApiTokens(campaignId);

  return (
    <HudPanel>
      <h2 className="mb-3 font-semibold text-hud-ink">API-токени</h2>
      <QueryState query={tokens.query}>{(list) => <ApiTokenList tokens={list} scopes={scopes} actions={{ onCreate: tokens.create, onRevoke: (id) => void tokens.revoke(id) }} />}</QueryState>
    </HudPanel>
  );
}

function AssistantPanels({ campaignId }: { campaignId: string }) {
  const settings = useAiSettings(campaignId);

  return (
    <>
      <HudPanel>
        <h2 className="mb-3 font-semibold text-hud-ink">Інструкції для асистента</h2>
        <QueryState query={settings.query}>{() => <AiInstructionsEditor value={settings.instructions} onSave={settings.save} pending={settings.isPending} />}</QueryState>
      </HudPanel>
      <HudPanel>
        <h2 className="mb-1 font-semibold text-hud-ink">Ключі провайдерів</h2>
        <p className="text-sm text-hud-muted">
          Ключі OpenAI, Anthropic та інших налаштовуються в{" "}
          <Link href="/settings/ai" className="underline">
            налаштуваннях AI
          </Link>
          .
        </p>
      </HudPanel>
    </>
  );
}

function McpPanel() {
  const origin = useSyncExternalStore(subscribeNothing, () => window.location.origin, () => "");

  return (
    <HudPanel>
      <h2 className="mb-3 font-semibold text-hud-ink">Підключення MCP</h2>
      <div className="space-y-3">
        {snippets(origin).map(({ label, json }) => (
          <div key={label}>
            <p className="mb-1 text-sm text-hud-muted">{label}</p>
            <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-hud-ink">{JSON.stringify(json, null, 2)}</pre>
          </div>
        ))}
      </div>
    </HudPanel>
  );
}

function RestApiPanel({ campaignId }: { campaignId: string }) {
  const origin = useSyncExternalStore(subscribeNothing, () => window.location.origin, () => "");

  const curl = `curl -H "Authorization: Bearer <токен>" ${origin}/api/campaigns/${campaignId}/units`;

  return (
    <HudPanel>
      <h2 className="mb-3 font-semibold text-hud-ink">REST API</h2>
      <p className="mb-2 text-sm text-hud-muted">
        Опис усіх операцій контенту:{" "}
        <a href="/api/openapi.json" target="_blank" rel="noreferrer" className="underline">
          openapi.json
        </a>
        . Права токена вказано в кожній операції (x-scopes).
      </p>
      <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-hud-ink">{curl}</pre>
    </HudPanel>
  );
}

export function DmAiPageClient({ campaignId, isTemplate }: { campaignId: string; isTemplate: boolean }) {
  return (
    <HudPage>
      <HudPageHeader
        title={isTemplate ? "API" : "AI і API"}
        subtitle={isTemplate ? "Токени для доступу до контенту шаблону через API." : "Токени для зовнішніх AI-клієнтів і підключення MCP."}
      />
      <div className="space-y-4">
        {!isTemplate && <AssistantPanels campaignId={campaignId} />}
        <TokensPanel campaignId={campaignId} scopes={isTemplate ? CONTENT_SCOPES : API_TOKEN_SCOPES} />
        <RestApiPanel campaignId={campaignId} />
        {!isTemplate && <McpPanel />}
      </div>
    </HudPage>
  );
}
