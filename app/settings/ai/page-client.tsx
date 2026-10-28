"use client";

import { AiProviderCard } from "@/components/ai";
import { ErrorState, QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { AI_PROVIDERS } from "@/lib/constants/ai";
import { useAiCredentials } from "@/lib/hooks/ai";
import { useConfirm } from "@/lib/hooks/common";

export function AiSettingsClient({ configured }: { configured: boolean }) {
  const ai = useAiCredentials();

  const confirm = useConfirm();

  if (!configured) return <ErrorState error="AI-асистент не налаштований на сервері" />;

  return (
    <HudPage>
      <HudPageHeader title="AI-ключі" subtitle="Ключ зберігається зашифрованим і ніколи не показується повністю. Оплата — напряму з вашого рахунку провайдера." />
      <QueryState query={ai.query}>
        {(credentials) => (
          <div className="grid gap-4 md:grid-cols-3">
            {AI_PROVIDERS.map((provider) => (
              <AiProviderCard
                key={provider}
                provider={provider}
                credential={credentials.find((c) => c.provider === provider) ?? null}
                pending={ai.isPending}
                actions={{
                  onSave: (apiKey, defaultModel) => void ai.save({ provider, apiKey, defaultModel }),
                  onModel: (defaultModel) => void ai.patch({ provider, defaultModel }),
                  onDelete: async () => {
                    const ok = await confirm({ title: "Видалити ключ?", description: "AI-чати цього провайдера перестануть працювати.", confirmLabel: "Видалити", destructive: true });

                    if (ok) void ai.remove(provider);
                  },
                }}
              />
            ))}
          </div>
        )}
      </QueryState>
    </HudPage>
  );
}
