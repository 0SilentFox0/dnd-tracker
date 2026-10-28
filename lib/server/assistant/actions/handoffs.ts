import { z } from "zod";

import type {
  ActionResult,
  AssistantActionDef,
  HandoffResult,
  JsonValue,
} from "../types";

import "server-only";
import { prisma } from "@/lib/db";
import {
  handoffContentKind,
  handoffId,
  isAssistantHandoffHref,
} from "@/lib/schemas/assistant-handoff";
import {
  kindTable,
  prismaImportRepository,
} from "@/lib/server/compendium-import/repository";
import { assertCan } from "@/lib/server/content/access";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { BUNDLE_TABLES, delegateOf } from "@/lib/server/templates/bundle";
import type { Actor, ActorNeed } from "@/lib/utils/api/actor";
import { isDmMember } from "@/lib/utils/api/is-dm";

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

const reasons: Record<HandoffKind, string> = {
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

  return { href, reason: reasons[key] };
}

const compendiumNeed: ActorNeed = {
  access: "dm",
  scope: "content:write",
  sessionOnly: true,
};

const windowSchema = z.strictObject({
  offset: z.number().int().min(0).max(100_000).default(0),
  limit: z.number().int().min(1).max(20).default(20),
});

const importKind = z.enum(
  Object.keys(kindTable) as Array<keyof typeof kindTable>
);

export const COMPENDIUM_READ_INPUTS = {
  "note-options": windowSchema,
  reports: windowSchema.extend({ runId: handoffId.optional() }),
  options: windowSchema.extend({ kind: importKind.default("spells") }),
  entries: windowSchema.extend({ kind: importKind, targetId: handoffId }),
  notes: z.strictObject({
    selectedKeys: z
      .array(z.string().min(1).max(512))
      .min(1)
      .max(5)
      .refine((ids) => new Set(ids).size === ids.length),
  }),
};

type CompendiumRead = keyof typeof COMPENDIUM_READ_INPUTS;

function safeText(value: unknown, max = 200): string {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s<>]+/gi, (url) => {
      try {
        const parsed = new URL(url);

        return parsed.search ||
          parsed.hash ||
          parsed.username ||
          parsed.password
          ? "[Приватне посилання у застосунку]"
          : url;
      } catch {
        return "[Посилання у застосунку]";
      }
    })
    .replace(/\bBearer\s+\S+|\bsk-[A-Za-z0-9_-]{8,}/gi, "[Приховано]")
    .slice(0, max);
}

const result = (data: unknown): ActionResult => ({
  data: JSON.parse(JSON.stringify(data)) as JsonValue,
  affected: [],
  warnings: [],
});

const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;

/** Session-only bounded projections. No importer, raw JSON, credentials or provider calls. */
export async function readCompendiumSummary(
  actor: Actor,
  operation: CompendiumRead,
  raw: unknown
): Promise<ActionResult> {
  assertCan(actor, compendiumNeed);

  const input = parseInput(COMPENDIUM_READ_INPUTS[operation] as z.ZodType, raw);

  const members = await prisma.campaignMember.findMany({ where: { campaignId: actor.campaignId, userId: actor.userId }, select: { role: true } });

  if (!isDmMember(members)) throw new ContentError("Доступ має лише ДМ кампанії", 403);

  await prismaImportRepository.authorize(actor);

  if (operation === "note-options") {
    const { offset, limit } = input as z.infer<typeof windowSchema>;

    const rows = await prisma.compendiumEntry.findMany({ where: { campaignId: actor.campaignId }, select: { canonicalKey: true, originalName: true }, orderBy: { canonicalKey: "asc" }, skip: offset, take: limit + 1 });

    return result({ items: rows.slice(0, limit).map(row => ({ canonicalKey: row.canonicalKey, title: safeText(row.originalName) })), nextOffset: rows.length > limit ? offset + limit : null });
  }

  if (operation === "notes") {
    const { selectedKeys } = input as z.infer<
      typeof COMPENDIUM_READ_INPUTS.notes
    >;

    const rows = await prisma.compendiumEntry.findMany({
      where: {
        campaignId: actor.campaignId,
        canonicalKey: { in: selectedKeys },
      },
      take: 5,
      select: {
        canonicalKey: true,
        originalName: true,
        edition: true,
        notes: true,
      },
    });

    if (
      rows.length !== selectedKeys.length ||
      rows.some((r) => !selectedKeys.includes(r.canonicalKey))
    )
      throw new ContentError("Примітки не знайдено у кампанії", 404);

    return result({
      entries: rows.map((r) => ({
        canonicalKey: safeText(r.canonicalKey, 512),
        originalName: safeText(r.originalName),
        edition: safeText(r.edition, 20),
        notes: /^[\s]*[\[{]/.test(r.notes)
          ? "Структуровані примітки перегляньте у застосунку."
          : safeText(r.notes, 3000),
      })),
      explicitlySelected: true,
    });
  }

  const value = input as z.infer<typeof COMPENDIUM_READ_INPUTS.entries> & {
    runId?: string;
  };

  const { offset, limit } = value;

  if (operation === "reports") {
    const rows = await prisma.compendiumImportRun.findMany({
      where: {
        campaignId: actor.campaignId,
        ...(value.runId && { id: value.runId }),
      },
      skip: offset,
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, createdAt: true, report: true },
    });

    return result({
      runs: rows.slice(0, limit).map((row) => {
        const report = row.report as Record<string, unknown>;

        const counts = report?.counts as Record<string, unknown> | undefined;

        return {
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          counts: {
            created: count(counts?.created),
            updated: count(counts?.updated),
            unchanged: count(counts?.unchanged),
            errors: count(counts?.errors),
          },
          readyToImport: report?.readyToImport === true,
          readyToPlay: report?.readyToPlay === true,
        };
      }),
      hasMore: rows.length > limit,
    });
  }

  if (operation === "entries") {
    const rows = await prisma.compendiumEntry.findMany({
      where: {
        campaignId: actor.campaignId,
        kind: value.kind,
        localId: value.targetId,
      },
      skip: offset,
      take: limit + 1,
      orderBy: { canonicalKey: "asc" },
      select: { canonicalKey: true, originalName: true, edition: true },
    });

    return result({
      entries: rows
        .slice(0, limit)
        .map((r) => ({
          canonicalKey: safeText(r.canonicalKey, 512),
          originalName: safeText(r.originalName),
          edition: safeText(r.edition, 20),
        })),
      hasMore: rows.length > limit,
      notesRequireSelection: true,
    });
  }

  const table = BUNDLE_TABLES.find((t) => t.key === kindTable[value.kind]);

  if (!table) throw new ContentError("Недоступний вид контенту", 400);

  const rows = await delegateOf(prisma, table).findMany({
    where: { campaignId: actor.campaignId },
    skip: offset,
    take: limit + 1,
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });

  return result({
    local: rows
      .slice(0, limit)
      .map((r) => ({
        id: String(r.id),
        name: safeText(r.name),
        kind: value.kind,
      })),
    hasMore: rows.length > limit,
  });
}

const handoffs: AssistantActionDef[] = Object.entries(HANDOFF_INPUTS).map(
  ([kind, input]) => ({
    id: `handoff.${kind}`,
    title: `Відкрити у застосунку: ${kind}`,
    description: reasons[kind as HandoffKind],
    input,
    need: {
      access: "dm",
      scope:
        kind === "credentials" || kind === "player-draft"
          ? "campaign:read"
          : [
              "content-import",
              "ai-map",
              "compendium-preview",
              "compendium-confirm",
              "source-notes",
            ].includes(kind)
          ? "content:write"
          : kind === "slide-upload"
          ? "show:write"
          : kind === "track-upload"
          ? "content:write"
          : "campaign:read",
      sessionOnly: true,
    },
    effect: "handoff",
    execute: async (caller, raw) =>
      buildAssistantHandoff(caller.actor, kind, raw),
  })
);

/** Source-note text is intentionally absent from model-callable reads. Only the explicit UI selection invokes the session helper above. */
export const HANDOFF_ACTIONS: readonly AssistantActionDef[] = [
  ...handoffs,
  ...(["options", "reports", "entries"] as const).map(
    (operation): AssistantActionDef => ({
      id: `compendium.${operation}`,
      title: `Компендіум: ${operation}`,
      description:
        "Дозволений стислий підсумок; повні матеріали та примітки вибирає людина у застосунку.",
      input: COMPENDIUM_READ_INPUTS[operation],
      need: compendiumNeed,
      effect: "read",
      handoff: async (caller) =>
        caller.actor.via === "token"
          ? buildAssistantHandoff(caller.actor, "source-notes")
          : null,
      execute: (caller, raw) =>
        readCompendiumSummary(caller.actor, operation, raw),
    })
  ),
];
