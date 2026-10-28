import { z } from "zod";

import type { HandoffResult } from "../types";

import "server-only";
import { handoffContentKind, handoffId, isAssistantHandoffHref } from "@/lib/schemas/assistant-handoff";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";

const empty = z.strictObject({});

export const HANDOFF_INPUTS = {
  credentials: empty,
  tokens: empty,
  invite: empty,
  "campaign-import": empty,
  "campaign-join": empty,
  "content-import": z.strictObject({ kind: handoffContentKind }),
  "ai-map": z.strictObject({ kind: handoffContentKind }),
  "slide-upload": z.strictObject({ deckId: handoffId.optional() }),
  "track-upload": empty,
  "player-draft": empty,
  "compendium-read": empty, "compendium-preview": empty,
  "compendium-confirm": empty,
  "source-notes": empty,
};

type HandoffKind = keyof typeof HANDOFF_INPUTS;

export const HANDOFF_REASONS: Record<HandoffKind, string> = {
  "compendium-read": "Перегляньте дозволені звіти та варіанти імпорту через власну сесію у застосунку.",
  credentials: "Додайте або змініть ключ провайдера у налаштуваннях AI.",
  tokens: "Керуйте API-токенами та їхніми правами у застосунку.",
  invite:
    "Перегляньте запрошення у кампанії та передайте його людині самостійно.",
  "campaign-import": "Виберіть локальний файл у формі створення кампанії.",
  "campaign-join": "Введіть код запрошення у діалозі входу в кампанію.",
  "content-import":
    "Виберіть файл, перевірте мапінг і підтвердіть імпорт у чинному редакторі.",
  "ai-map": "Оберіть дані та запустіть AI-мапінг у діалозі імпорту.",
  "slide-upload": "Виберіть зображення у редакторі набору слайдів.",
  "track-upload": "Виберіть аудіофайл у бібліотеці музики.",
  "player-draft":
    "Чернетка та AI-функції гравця доступні лише у власному флоу гравця.",
  "compendium-preview":
    "Виберіть локальний JSON, перевірте preview і підтвердіть права на матеріали у застосунку.",
  "compendium-confirm":
    "Відкрийте чинний preview, перевірте вибір і підтвердіть права на імпорт у застосунку.",
  "source-notes":
    "ДМ має явно вибрати примітки джерела перед передачею AI. Автоматично примітки не передаються.",
};

/** A link grants no rights. The destination keeps its current session/ownership guards. */
export function buildAssistantHandoff(
  actor: Actor,
  kind: string,
  target: unknown = {}
): HandoffResult {
  if (!actor.isDM || !actor.userId)
    throw new ContentError("Доступ має лише ДМ", 403);

  const campaignId = parseInput(handoffId, actor.campaignId);

  if (!Object.hasOwn(HANDOFF_INPUTS, kind))
    throw new ContentError("Невідомий перехід", 400);

  const key = kind as HandoffKind;

  const input = parseInput(HANDOFF_INPUTS[key] as z.ZodType, target) as {
    kind?: z.infer<typeof handoffContentKind>;
    deckId?: string;
  };

  const base = `/campaigns/${campaignId}`;

  const content = input.kind === "tracks" ? "music" : input.kind;

  const href =
    key === "credentials"
      ? "/settings/ai"
      : key === "tokens"
      ? `${base}/dm/ai`
      : key === "invite"
      ? `${base}#invite`
      : key === "campaign-import"
      ? "/campaigns/new"
      : key === "campaign-join"
      ? "/campaigns"
      : key === "content-import" || key === "ai-map"
      ? `${base}/dm/${content}`
      : key === "slide-upload"
      ? `${base}/dm/show${input.deckId ? `/${input.deckId}` : ""}`
      : key === "track-upload"
      ? `${base}/dm/music`
      : key === "player-draft"
      ? `${base}/character/draft`
      : `${base}/dm/compendium`;

  if (!isAssistantHandoffHref(href))
    throw new ContentError("Недоступний перехід", 400);

  return { href, reason: HANDOFF_REASONS[key] };
}
