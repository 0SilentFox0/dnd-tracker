"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AiInstructionsEditor, ApiTokenList } from "@/components/ai";
import { QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { API_TOKEN_SCOPES, type ApiTokenScope, CONTENT_SCOPES } from "@/lib/constants/ai";
import { useAiSettings, useApiTokens } from "@/lib/hooks/ai";

const snippets = (origin: string, placeholder: string) => [
  {
    label: "Claude Desktop",
    json: { mcpServers: { "dnd-tracker": { command: "npx", args: ["-y", "mcp-remote", `${origin}/api/mcp`, "--header", "Authorization: Bearer ${DNDT_TOKEN}"], env: { DNDT_TOKEN: placeholder } } } },
  },
  {
    label: "Cursor",
    json: { mcpServers: { "dnd-tracker": { url: `${origin}/api/mcp`, headers: { Authorization: `Bearer ${placeholder}` } } } },
  },
];

const subscribeNothing = () => () => {};

function TokensPanel({ campaignId, scopes }: { campaignId: string; scopes: readonly ApiTokenScope[] }) {
  const t = useTranslations("ai");

  const tokens = useApiTokens(campaignId);

  return (
    <HudPanel>
      <h2 className="mb-3 font-semibold text-hud-ink">{t("page.tokensHeading")}</h2>
      <QueryState query={tokens.query}>{(list) => <ApiTokenList campaignId={campaignId} tokens={list} scopes={scopes} actions={{ onCreate: tokens.create, onRevoke: (id) => void tokens.revoke(id) }} />}</QueryState>
    </HudPanel>
  );
}

function AssistantPanels({ campaignId }: { campaignId: string }) {
  const t = useTranslations("ai");

  const settings = useAiSettings(campaignId);

  return (
    <>
      <HudPanel>
        <h2 className="mb-3 font-semibold text-hud-ink">{t("page.instructionsHeading")}</h2>
        <QueryState query={settings.query}>{() => <AiInstructionsEditor value={settings.instructions} onSave={settings.save} pending={settings.isPending} />}</QueryState>
      </HudPanel>
      <HudPanel>
        <h2 className="mb-1 font-semibold text-hud-ink">{t("page.keysHeading")}</h2>
        <p className="text-sm text-hud-muted">
          {t.rich("page.keysBody", {
            link: (chunks) => (
              <Link href="/settings/ai" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </HudPanel>
    </>
  );
}

function McpPanel() {
  const t = useTranslations("ai");

  const origin = useSyncExternalStore(subscribeNothing, () => window.location.origin, () => "");

  return (
    <HudPanel>
      <h2 className="mb-3 font-semibold text-hud-ink">{t("page.mcpHeading")}</h2>
      <div className="space-y-3">
        {snippets(origin, `<${t("page.tokenPlaceholder")}>`).map(({ label, json }) => (
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
  const t = useTranslations("ai");

  const origin = useSyncExternalStore(subscribeNothing, () => window.location.origin, () => "");

  const curl = `curl -H "Authorization: Bearer <${t("page.curlTokenPlaceholder")}>" ${origin}/api/campaigns/${campaignId}/units`;

  return (
    <HudPanel>
      <h2 className="mb-3 font-semibold text-hud-ink">REST API</h2>
      <p className="mb-2 text-sm text-hud-muted">
        {t.rich("page.restBody", {
          link: (chunks) => (
            <a href="/api/openapi.json" target="_blank" rel="noreferrer" className="underline">
              {chunks}
            </a>
          ),
        })}
      </p>
      <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-hud-ink">{curl}</pre>
    </HudPanel>
  );
}

export function DmAiPageClient({ campaignId, isTemplate }: { campaignId: string; isTemplate: boolean }) {
  const t = useTranslations("ai");

  return (
    <HudPage>
      <HudPageHeader
        title={isTemplate ? t("page.titleTemplate") : t("page.title")}
        subtitle={isTemplate ? t("page.subtitleTemplate") : t("page.subtitle")}
      />
      <div className="space-y-4">
        {!isTemplate && <AssistantPanels campaignId={campaignId} />}
        <TokensPanel campaignId={campaignId} scopes={isTemplate ? CONTENT_SCOPES : API_TOKEN_SCOPES} />
        <RestApiPanel campaignId={campaignId} />
        <McpPanel />
      </div>
    </HudPage>
  );
}
