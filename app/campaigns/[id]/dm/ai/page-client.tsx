"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

import { AiInstructionsEditor, ApiTokenList } from "@/components/ai";
import { QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
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

export function DmAiPageClient({ campaignId }: { campaignId: string }) {
  const tokens = useApiTokens(campaignId);

  const settings = useAiSettings(campaignId);

  const origin = useSyncExternalStore(subscribeNothing, () => window.location.origin, () => "");

  return (
    <HudPage>
      <HudPageHeader title="AI і API" subtitle="Токени для зовнішніх AI-клієнтів і підключення MCP." />
      <div className="space-y-4">
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
        <HudPanel>
          <h2 className="mb-3 font-semibold text-hud-ink">API-токени</h2>
          <QueryState query={tokens.query}>{(list) => <ApiTokenList tokens={list} actions={{ onCreate: tokens.create, onRevoke: (id) => void tokens.revoke(id) }} />}</QueryState>
        </HudPanel>
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
      </div>
    </HudPage>
  );
}
