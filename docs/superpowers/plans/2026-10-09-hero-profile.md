# Профіль героя: фото, жетони, архетипи — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Велике фото героя з Storage, червоні/зелені жетони від ДМа в «Історії», ріст HP і шкоди за архетипом + расою замість ручних множників.

**Architecture:** Фото — data URL з форми при збереженні дзеркалиться в Supabase Storage (бакет `avatars`) тим самим механізмом, що іконки артефактів; у БД і знімках бою лише URL. Жетони — нова таблиця, читаються разом з листом героя (`GET …/sheet`, який вже пускає лише ДМа й власника), пишуться ДМом через `POST/DELETE …/tokens`. Архетип — нове поле героя; `from-character.ts` перекладає його відсотки в наявні `abilities.meleeMultiplier/rangedMultiplier` (+ новий `magicMultiplier`), тож рушій атак, розбір і оцінка балансу працюють без нової логіки.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6, Supabase Storage, TanStack Query, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-hero-profile-design.md`

## Global Constraints

- Мова UI й повідомлень — українська; ідентифікатори — англійські.
- Міграції лише expand-only; кожен `CREATE TABLE` — з `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (`prisma/__tests__/migrations-rls.test.ts`).
- Компоненти не імпортують `@/lib/api/*`; запити — `lib/api/<domain>`, логіка — хуки `lib/hooks/<domain>`.
- Діалоги — лише `ResponsiveDialog` (`components/ui/responsive-dialog`), підтвердження — `useConfirm()`.
- Мінімум коментарів; порожній рядок навколо `const`/`if`/`return` (ESLint `padding-line-between-statements`); `pnpm lint --fix` для сортування імпортів.
- Після кожної задачі: `pnpm test:run <змінені тести>` і `pnpm exec tsc --noEmit`.
- Архетипи (ключ → HP/рівень, ближній, дальній, магія): `universal`(null) 10/1/1/1, `warrior` 12/1.2/0.8/0.6, `paladin` 14/1.1/0.5/0.9, `ranger` 9/0.7/1.25/0.7, `rogue` 9/1.1/1.0/0.6, `mage` 8/0.5/0.6/1.25.
- HP: `max(1, floor(3 × hpPerLevel + level × (hpPerLevel + conMod × 1.5)))`.

## Review Focus

1. Збереження героя з уже-URL аватаром (не data URL) не має нічого вантажити повторно — URL зберігається як є (Task 1 тест).
2. Гравець з `allowPlayerEdit` надсилає `archetype` у PATCH — поле має ігноруватися (Task 8 тест).
3. ДМ видаляє жетон іншого героя/кампанії через свій `characterId` — 404 (Task 5 тест).
4. Бій, створений до релізу, містить у знімку старі `meleeMultiplier` — рушій має продовжувати їх читати (не ламатися); новий бій бере архетип (Task 7 тест «null-архетип = 1»).
5. Порожній/пробільний підпис жетона — 400, а не порожній жетон (Task 5 тест).

---

## Частина 1. Велике фото

### Task 1: Аватар у Storage при збереженні героя

**Files:**
- Modify: `lib/supabase/artifact-icon-storage.ts` (параметр бакета + `cacheControl`)
- Create: `lib/supabase/avatar-storage.ts`
- Modify: `app/api/campaigns/[id]/characters/create-character.ts`, `app/api/campaigns/[id]/characters/[characterId]/patch-character.ts`
- Test: `lib/supabase/__tests__/avatar-storage.test.ts`

**Interfaces:**
- Produces: `AVATARS_BUCKET = "avatars"`; `resolveAvatarForPersistence(avatar: string | null | undefined, opts: { campaignId: string }): Promise<{ ok: true; avatar: string | null | undefined } | { ok: false; message: string }>` — `undefined` повертається як `undefined` (поле не змінюється).

- [ ] **Step 1: Узагальнити storage-хелпери.** У `artifact-icon-storage.ts` додати до `ensureBucket(supabase, bucket = ARTIFACT_ICONS_BUCKET)` параметр бакета, а до `uploadArtifactIconDataUrlToSupabase` і `resolveArtifactIconForPersistence` опції `bucket?: string` і `cacheControl?: string`, які передаються в `.upload(fullPath, buffer, { contentType: mime, upsert: true, cacheControl })` і `getPublicUrl`. Значення за замовчуванням зберігають поточну поведінку артефактів.

- [ ] **Step 2: Тест.**

```ts
// lib/supabase/__tests__/avatar-storage.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storage from "@/lib/supabase/artifact-icon-storage";
import { AVATARS_BUCKET, resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";

vi.mock("@/lib/supabase/artifact-icon-storage", async (orig) => ({ ...(await orig<typeof storage>()), resolveArtifactIconForPersistence: vi.fn() }));

describe("resolveAvatarForPersistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("undefined лишає поле незмінним, нічого не вантажить", async () => {
    expect(await resolveAvatarForPersistence(undefined, { campaignId: "c" })).toEqual({ ok: true, avatar: undefined });
    expect(storage.resolveArtifactIconForPersistence).not.toHaveBeenCalled();
  });

  it("http-URL нашого Storage зберігається як є", async () => {
    const url = "https://x.supabase.co/storage/v1/object/public/avatars/c/a.webp";

    expect(await resolveAvatarForPersistence(url, { campaignId: "c" })).toEqual({ ok: true, avatar: url });
    expect(storage.resolveArtifactIconForPersistence).not.toHaveBeenCalled();
  });

  it("data URL вантажиться в бакет avatars з річним cacheControl", async () => {
    vi.mocked(storage.resolveArtifactIconForPersistence).mockResolvedValue({ ok: true, icon: "https://s/avatars/c/x.webp" });

    const r = await resolveAvatarForPersistence("data:image/webp;base64,AAAA", { campaignId: "c" });

    expect(r).toEqual({ ok: true, avatar: "https://s/avatars/c/x.webp" });
    expect(storage.resolveArtifactIconForPersistence).toHaveBeenCalledWith("data:image/webp;base64,AAAA", expect.objectContaining({ campaignId: "c", bucket: AVATARS_BUCKET, cacheControl: "31536000" }));
  });

  it("помилка завантаження повертається як ok:false", async () => {
    vi.mocked(storage.resolveArtifactIconForPersistence).mockResolvedValue({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
    expect(await resolveAvatarForPersistence("data:image/png;base64,AAAA", { campaignId: "c" })).toEqual({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
  });
});
```

- [ ] **Step 3:** `pnpm test:run lib/supabase/__tests__/avatar-storage.test.ts` → FAIL (модуля немає).

- [ ] **Step 4: Реалізація.**

```ts
// lib/supabase/avatar-storage.ts
import { isArtifactIconHostedOnProjectStorage, resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";

export const AVATARS_BUCKET = "avatars";

const YEAR_SECONDS = "31536000";

export async function resolveAvatarForPersistence(
  avatar: string | null | undefined,
  opts: { campaignId: string },
): Promise<{ ok: true; avatar: string | null | undefined } | { ok: false; message: string }> {
  if (avatar === undefined) return { ok: true, avatar: undefined };

  if (avatar && isArtifactIconHostedOnProjectStorage(avatar)) return { ok: true, avatar };

  // a new object per upload keeps the year-long cache valid
  const r = await resolveArtifactIconForPersistence(avatar, { campaignId: opts.campaignId, objectBaseName: crypto.randomUUID().replace(/-/g, ""), bucket: AVATARS_BUCKET, cacheControl: YEAR_SECONDS });

  return r.ok ? { ok: true, avatar: r.icon } : r;
}
```

- [ ] **Step 5: Підключити в маршрути.** У `patch-character.ts` після `parseBody` і стрипу полів:

```ts
  const avatar = await resolveAvatarForPersistence(data.avatar, { campaignId });

  if (!avatar.ok) return errorResponse(avatar.message, 400);
```

і в `prisma.character.update({ data: { ...data, avatar: avatar.avatar, … } })`. У `create-character.ts` так само перед `prisma.character.create`, `avatar: avatar.avatar ?? undefined`.

- [ ] **Step 6:** `pnpm test:run lib/supabase app/api/__tests__/character-patch-fields.test.ts app/api/__tests__/character-create-slots.test.ts` → PASS (якщо наявні тести мокають `@/lib/db` без Supabase — додати `vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: async (a: unknown) => ({ ok: true, avatar: a }) }))`).

- [ ] **Step 7: Commit** `feat(characters): store hero avatars in Supabase Storage`.

### Task 2: Стиснення фото в браузері

**Files:**
- Create: `lib/utils/common/image-resize.ts`
- Modify: `components/ui/image-upload.tsx`, `components/characters/basic/CharacterBasicInfo.tsx:202`
- Test: `lib/utils/common/__tests__/image-resize.test.ts`

**Interfaces:**
- Produces: `fitWithin(w: number, h: number, maxSide: number): { width: number; height: number }`; `resizeImageToDataUrl(file: File, maxSide: number, quality?: number): Promise<string>`; prop `ImageUpload.maxSide?: number`.

- [ ] **Step 1: Тест.**

```ts
import { describe, expect, it } from "vitest";

import { fitWithin } from "@/lib/utils/common/image-resize";

describe("fitWithin", () => {
  it("не збільшує малі фото", () => expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 }));
  it("зменшує по довшій стороні, зберігаючи пропорцію", () => expect(fitWithin(3000, 4000, 1200)).toEqual({ width: 900, height: 1200 }));
  it("горизонтальне", () => expect(fitWithin(4000, 1000, 1200)).toEqual({ width: 1200, height: 300 }));
});
```

- [ ] **Step 2:** запустити → FAIL.

- [ ] **Step 3: Реалізація.**

```ts
// lib/utils/common/image-resize.ts
export function fitWithin(w: number, h: number, maxSide: number): { width: number; height: number } {
  const k = Math.min(1, maxSide / Math.max(w, h));

  return { width: Math.round(w * k), height: Math.round(h * k) };
}

export async function resizeImageToDataUrl(file: File, maxSide: number, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);

  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/webp", quality);
}
```

- [ ] **Step 4: `ImageUpload`.** Додати prop `maxSide?: number`. Коли він заданий: ліміт файлу 15 МБ замість 3 МБ (`const limit = maxSide ? 15 * 1024 * 1024 : MAX_SIZE_BYTES`), а замість `FileReader` — `resizeImageToDataUrl(file, maxSide).then(onChange, () => void notify("Не вдалося обробити зображення"))`. Без `maxSide` поведінка незмінна.

- [ ] **Step 5:** У `CharacterBasicInfo` передати `maxSide={1200}` і `label="Фото персонажа"`.

- [ ] **Step 6:** тест PASS, `pnpm exec tsc --noEmit`.

- [ ] **Step 7: Commit** `feat(characters): downscale hero photo to 1200px webp before upload`.

### Task 3: Великий портрет у профілі та картці ДМа

**Files:**
- Create: `components/character-profile/HeroPortrait.tsx`
- Modify: `components/character-profile/ProfileHero.tsx`, `app/campaigns/[id]/dm/characters/DmCharacterCard.tsx`
- Test: `components/character-profile/__tests__/HeroPortrait.test.tsx`

**Interfaces:**
- Produces: `HeroPortrait({ src, name, className }: { src: string | null | undefined; name: string; className?: string })` — `aspect-[3/4]` рамка, `OptimizedImage` `fill` + `object-cover`, натиск відкриває `ResponsiveDialog` з фото на весь екран; без `src` — велика перша літера імені.

- [ ] **Step 1: Тест** (`// @vitest-environment happy-dom`): з `src` рендериться `img` з `alt` = ім'я і кнопка «Відкрити фото»; без `src` — літера `"А"` для імені «Арвен» і немає кнопки.

```tsx
// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeroPortrait } from "@/components/character-profile/HeroPortrait";

describe("HeroPortrait", () => {
  it("фото з кнопкою перегляду", () => {
    render(<HeroPortrait src="https://x.supabase.co/storage/v1/object/public/avatars/c/a.webp" name="Арвен" />);
    expect(screen.getByRole("button", { name: "Відкрити фото" })).toBeTruthy();
    expect(screen.getByAltText("Арвен")).toBeTruthy();
  });

  it("без фото — перша літера", () => {
    render(<HeroPortrait src={null} name="Арвен" />);
    expect(screen.getByText("А")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Реалізація.**

```tsx
"use client";

import { useState } from "react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";

export function HeroPortrait({ src, name, className }: { src: string | null | undefined; name: string; className?: string }) {
  const [open, setOpen] = useState(false);

  const frame = cn("relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-hud-gold bg-[#2a2016]", className);

  if (!src) {
    return (
      <div className={cn(frame, "hud-sc flex items-center justify-center text-6xl text-hud-gold")}>{name.trim().charAt(0).toUpperCase() || "?"}</div>
    );
  }

  return (
    <>
      <button type="button" aria-label="Відкрити фото" onClick={() => setOpen(true)} className={frame}>
        <OptimizedImage src={src} alt={name} fill sizes="(min-width: 1024px) 320px, 100vw" className="object-cover" />
      </button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title={name} hud>
        <div className="relative aspect-[3/4] max-h-[80vh] w-full">
          <OptimizedImage src={src} alt={name} fill sizes="100vw" className="object-contain" />
        </div>
      </ResponsiveDialog>
    </>
  );
}
```

Перевірити реальні props `OptimizedImage` (`components/common/OptimizedImage.tsx`) і `ResponsiveDialog` (`components/ui/responsive-dialog`) та підлаштувати назви (`fill`, `sizes`, `title`, `hud`). Якщо `OptimizedImage` не підтримує data URL — для `src.startsWith("data:")` рендерити звичайний `<img>` (як `EntityIcon`). Шлях `cn` — як в інших компонентах.

- [ ] **Step 4: `ProfileHero`.** Замінити кружок `EntityIcon` на лейаут: обгортка `flex flex-col gap-3 lg:flex-row lg:items-start`; ліворуч `<HeroPortrait src={id.avatar} name={id.name} className="lg:w-80 lg:shrink-0" />`, праворуч наявний блок імені/рядка/HP/actions і `HudStatChip`-ряд. На телефоні портрет іде першим на всю ширину. Прибрати імпорт `EntityIcon`, якщо він більше не потрібен.

- [ ] **Step 5: `DmCharacterCard`.** Над рядком імені додати `<HeroPortrait src={character.avatar} name={character.name} className="max-h-72" />` (дропдаун лишити праворуч від імені); прибрати 56px `EntityIcon`.

- [ ] **Step 6:** `pnpm test:run components/character-profile` → PASS; `pnpm exec tsc --noEmit`.

- [ ] **Step 7: Commit** `feat(profile): large hero portrait in profile and DM roster`.

---

## Частина 2. Жетони

### Task 4: Таблиця жетонів і читання через лист героя

**Files:**
- Modify: `prisma/schema.prisma` (модель `CharacterToken`, зв'язок `tokens` у `Character`)
- Create: `prisma/migrations/20261016000000_character_tokens/migration.sql`
- Modify: `types/characters.ts` (`CharacterToken`, `CharacterSheet.story.tokens`), `app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts` (`include`), `lib/utils/characters/sheet/build-sheet.ts` (`story.tokens`)
- Test: `lib/utils/characters/__tests__/build-sheet.test.ts` (доповнити)

**Interfaces:**
- Produces: `type TokenColor = "red" | "green"`; `interface CharacterToken { id: string; color: TokenColor; label: string; createdAt: string }`; `CharacterSheet.story.tokens: CharacterToken[]` (новіші першими); `TOKEN_COLORS = ["red", "green"] as const` і `TOKEN_LABEL_MAX = 120` у `lib/constants/characters.ts`.

- [ ] **Step 1: Схема.**

```prisma
model CharacterToken {
  id          String    @id @default(cuid())
  characterId String
  character   Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  color       String
  label       String
  createdBy   String
  createdAt   DateTime  @default(now())

  @@index([characterId])
  @@map("character_tokens")
}
```

У `Character`: `tokens CharacterToken[]`.

- [ ] **Step 2: Міграція** (рукою, за зразком сусідніх):

```sql
CREATE TABLE "character_tokens" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "character_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "character_tokens_characterId_idx" ON "character_tokens"("characterId");

ALTER TABLE "character_tokens" ADD CONSTRAINT "character_tokens_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "character_tokens" ENABLE ROW LEVEL SECURITY;
```

Потім `pnpm exec prisma generate` і (за наявності локальної БД `pnpm db:local`) `pnpm exec prisma migrate dev` — переконатися, що діф порожній.

- [ ] **Step 3: Тест build-sheet.** До наявного фікстур-вводу додати `tokens: [{ id: "t1", color: "green", label: "Врятував селян", createdAt: new Date("2026-10-09T10:00:00Z"), createdBy: "dm", characterId: "c" }]` і перевірити `sheet.story.tokens` → `[{ id: "t1", color: "green", label: "Врятував селян", createdAt: "2026-10-09T10:00:00.000Z" }]`; без `tokens` → `[]`.

- [ ] **Step 4:** FAIL.

- [ ] **Step 5: Реалізація.** `SheetInput.character` отримує `tokens?: { id: string; color: string; label: string; createdAt: Date }[]`; у `story`:

```ts
tokens: (c.tokens ?? []).map((t) => ({ id: t.id, color: t.color as TokenColor, label: t.label, createdAt: t.createdAt.toISOString() })),
```

`loadSheetCharacter`: `include: { inventory: true, tokens: { orderBy: { createdAt: "desc" } } }`.

- [ ] **Step 6:** `pnpm test:run lib/utils/characters app/api/__tests__/character-sheet-api.test.ts prisma/__tests__` → PASS.

- [ ] **Step 7: Commit** `feat(characters): character tokens table, read with the sheet`.

### Task 5: API жетонів (ДМ)

**Files:**
- Create: `app/api/campaigns/[id]/characters/[characterId]/tokens/route.ts`, `…/tokens/[tokenId]/route.ts`, `lib/schemas/character-tokens.ts`
- Modify: `lib/api/characters.ts`
- Test: `app/api/__tests__/character-tokens-api.test.ts`

**Interfaces:**
- Consumes: `CharacterToken`, `TOKEN_COLORS`, `TOKEN_LABEL_MAX` (Task 4).
- Produces: `POST` → `201 { token: CharacterToken }`; `DELETE` → `200 { ok: true }`; `createCharacterToken(campaignId, characterId, { color, label })`, `deleteCharacterToken(campaignId, characterId, tokenId)` у `lib/api/characters.ts`.

- [ ] **Step 1: Тест** (стиль `character-goals-api.test.ts`; мок `requireCampaignAccess`, `prisma.character.findUnique`, `prisma.characterToken.{create,findUnique,delete}`):
  - гравець-власник POST → 403;
  - ДМ POST `{ color: "red", label: "  Вкрав у торговця  " }` → 201, `create` викликано з `label: "Вкрав у торговця"`, `createdBy: "dm"`;
  - ДМ POST `{ color: "blue", label: "x" }` → 400; `{ color: "red", label: "   " }` → 400; `label` 121 символ → 400;
  - герой з іншої кампанії → 404;
  - ДМ DELETE жетона, у якого `characterId` інший → 404; свого → 200 і `delete` викликано.

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Схема.**

```ts
// lib/schemas/character-tokens.ts
import { z } from "zod";

import { TOKEN_COLORS, TOKEN_LABEL_MAX } from "@/lib/constants/characters";

export const createTokenSchema = z.object({ color: z.enum(TOKEN_COLORS), label: z.string().trim().min(1).max(TOKEN_LABEL_MAX) });

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
```

- [ ] **Step 4: Маршрути.**

```ts
// tokens/route.ts
export async function POST(request: Request, { params }: { params: Promise<{ id: string; characterId: string }> }) {
  try {
    const { id, characterId } = await params;

    const access = await requireCampaignAccess(id, true);

    if (access instanceof NextResponse) return access;

    const character = await prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true } });

    if (!character || character.campaignId !== id) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const parsed = await parseBody(createTokenSchema, request, "Некоректний жетон");

    if (parsed instanceof NextResponse) return parsed;

    const row = await prisma.characterToken.create({ data: { characterId, color: parsed.color, label: parsed.label, createdBy: access.userId } });

    return NextResponse.json({ token: { id: row.id, color: row.color, label: row.label, createdAt: row.createdAt.toISOString() } }, { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create character token" });
  }
}
```

```ts
// tokens/[tokenId]/route.ts
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; characterId: string; tokenId: string }> }) {
  try {
    const { id, characterId, tokenId } = await params;

    const access = await requireCampaignAccess(id, true);

    if (access instanceof NextResponse) return access;

    const token = await prisma.characterToken.findUnique({ where: { id: tokenId }, select: { characterId: true, character: { select: { campaignId: true } } } });

    if (!token || token.characterId !== characterId || token.character.campaignId !== id) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    await prisma.characterToken.delete({ where: { id: tokenId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete character token" });
  }
}
```

Імпорти — як у `goals/route.ts`.

- [ ] **Step 5: Клієнт.**

```ts
export const createCharacterToken = (campaignId: string, characterId: string, body: CreateTokenInput) =>
  campaignPost<{ token: CharacterToken }>(campaignId, `/characters/${characterId}/tokens`, body);

export const deleteCharacterToken = (campaignId: string, characterId: string, tokenId: string) =>
  campaignDelete<{ ok: true }>(campaignId, `/characters/${characterId}/tokens/${tokenId}`);
```

- [ ] **Step 6:** PASS.
- [ ] **Step 7: Commit** `feat(characters): DM API to give and remove hero tokens`.

### Task 6: Блок «Жетони» в «Історії»

**Files:**
- Create: `lib/hooks/characters/useCharacterTokens.ts`, `components/character-profile/TokenList.tsx`, `components/character-profile/AddTokenDialog.tsx`
- Modify: `lib/hooks/characters/index.ts`, `components/character-profile/StoryTab.tsx`
- Test: `components/character-profile/__tests__/TokenList.test.tsx`

**Interfaces:**
- Consumes: `createCharacterToken`, `deleteCharacterToken` (Task 5), `sheet.story.tokens`, `sheet.viewer.isDM` (Task 4).
- Produces: `useCharacterTokens(campaignId, characterId): { add(input: CreateTokenInput): Promise<boolean>; remove(tokenId: string): Promise<boolean>; isPending: boolean }` — після успіху оновлює кеш `characterSheetKey(campaignId, characterId)` (`story.tokens`: новий — на початок; видалений — геть); помилка → `notify("Не вдалося зберегти жетон")`.

- [ ] **Step 1: Тест `TokenList`** (happy-dom, у `ConfirmProvider` з `components/ui/__tests__/render-with-confirm.tsx`; `ProfileContext` з фейковим `sheet`; хук замокано):
  - 2 червоних + 1 зелений → лічильники «2» і «1» з `aria-label` «Червоні жетони» / «Зелені жетони»;
  - підписи відображаються;
  - `viewer.isDM=false` → немає «+ Жетон» і кнопок «Видалити жетон»;
  - `viewer.isDM=true` → кнопки є;
  - порожньо → «Жетонів ще немає».

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Хук** — за зразком `useCharacterGoals.ts` (`useMutation`, `setQueryData` на `characterSheetKey`, `useNotify`).

- [ ] **Step 4: `TokenList`.** `Section title="ЖЕТОНИ"` (наявний `./Section`), рядок із двома лічильниками (кружок `bg-red-600`/`bg-emerald-600` + число), список `<li>` з кольоровою міткою, підписом, датою `new Date(createdAt).toLocaleDateString("uk-UA")`; для ДМа — кнопка «+ Жетон» (відкриває `AddTokenDialog`) і іконка-кнопка `aria-label="Видалити жетон"` з `useConfirm()` («Видалити жетон «…»?»). `campaignId`/`characterId` брати з `useProfile()` (перевірити, що контекст їх дає; інакше `sheet.identity.id` + `useParams`).

- [ ] **Step 5: `AddTokenDialog`.** `ResponsiveDialog hud`, `<form id="add-token-form">`: два чіпи кольору (`HudChipTabs` або дві кнопки з `aria-pressed`), `Input` підпису (`maxLength={TOKEN_LABEL_MAX}`), у `footer` кнопка `type="submit" form="add-token-form"` «Видати», disabled при порожньому підписі або `isPending`. Успіх → закрити й очистити.

- [ ] **Step 6: `StoryTab`.** Порядок: `<GoalList />`, `<TokenList />`, біографія.

- [ ] **Step 7:** `pnpm test:run components/character-profile lib/hooks/characters` → PASS; `pnpm lint`.

- [ ] **Step 8: Commit** `feat(profile): red/green tokens in the hero story tab`.

---

## Частина 3. Архетипи й раси

### Task 7: Архетипи, нова формула HP

**Files:**
- Create: `lib/constants/hero-archetypes.ts`, `prisma/migrations/20261017000000_character_archetype/migration.sql`
- Modify: `prisma/schema.prisma` (`archetype String?` у `Character`), `lib/constants/hero-scaling.ts`, `lib/utils/characters/hero-hp.ts`, `lib/utils/characters/sheet/build-sheet.ts` (`SheetInput.character`: `archetype`, без `hpMultiplier`), `app/api/campaigns/[id]/characters/list-characters.ts` (select `constitution`, `archetype` замість `hpMultiplier`), `types/characters.ts` (`Character.archetype`, `CharacterListItem` з `constitution`, `archetype` замість `strength`, `hpMultiplier`)
- Test: `lib/utils/characters/__tests__/hero-hp.test.ts` (переписати), `lib/constants/__tests__/hero-archetypes.test.ts`

**Interfaces:**
- Produces:

```ts
export const HERO_ARCHETYPE_KEYS = ["warrior", "paladin", "ranger", "rogue", "mage"] as const;
export type HeroArchetypeKey = (typeof HERO_ARCHETYPE_KEYS)[number];
export interface HeroArchetype { key: HeroArchetypeKey | null; name: string; hpPerLevel: number; melee: number; ranged: number; magic: number }
export function heroArchetype(key: string | null | undefined): HeroArchetype; // невідомий/null → Універсал
export const HERO_ARCHETYPE_OPTIONS: { value: string; label: string }[]; // "" = Універсал, далі 5 архетипів
export function getHeroMaxHpBreakdown(level: number, constitution: number, archetype: string | null | undefined): { total: number; breakdown: string[] };
export function getHeroMaxHp(level: number, constitution: number, archetype: string | null | undefined): number;
export function heroBaseHp(c: { level: number; constitution: number; archetype?: string | null }): { total: number; breakdown: string[] };
```

- [ ] **Step 1: Тести.**

```ts
// lib/utils/characters/__tests__/hero-hp.test.ts
describe("heroBaseHp", () => {
  it("3 × HP/рівень + рівень × (HP/рівень + мод. ВИТ × 1.5)", () => {
    expect(heroBaseHp({ level: 1, constitution: 12 }).total).toBe(41);
    expect(heroBaseHp({ level: 10, constitution: 12, archetype: "warrior" }).total).toBe(171);
    expect(heroBaseHp({ level: 15, constitution: 12, archetype: "paladin" }).total).toBe(274);
    expect(heroBaseHp({ level: 1, constitution: 12, archetype: "mage" }).total).toBe(33);
  });

  it("сила не впливає, невідомий архетип = Універсал", () => {
    expect(heroBaseHp({ level: 5, constitution: 10, archetype: "bogus" }).total).toBe(80);
  });

  it("мінімум 1", () => expect(heroBaseHp({ level: 1, constitution: 1, archetype: "mage" }).total).toBeGreaterThanOrEqual(1));

  it("розкладка", () => expect(heroBaseHp({ level: 1, constitution: 12 }).breakdown.at(-1)).toBe("= 30 + 1 × 11.5 = 41"));
});
```

```ts
// lib/constants/__tests__/hero-archetypes.test.ts
it("null і невідоме — Універсал 10/1/1/1", () => {
  expect(heroArchetype(null)).toMatchObject({ name: "Універсал", hpPerLevel: 10, melee: 1, ranged: 1, magic: 1 });
  expect(heroArchetype("x").name).toBe("Універсал");
});
it("значення зі спеки", () => {
  expect(heroArchetype("ranger")).toMatchObject({ hpPerLevel: 9, melee: 0.7, ranged: 1.25, magic: 0.7 });
  expect(HERO_ARCHETYPE_OPTIONS.map((o) => o.value)).toEqual(["", "warrior", "paladin", "ranger", "rogue", "mage"]);
});
```

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: `hero-archetypes.ts`** — таблиця з Global Constraints, назви: Універсал, Воїн, Паладин, Лучник, Розбійник, Маг.

- [ ] **Step 4: `hero-scaling.ts`.** Прибрати `hpBasePerLevel/hpStrCoefficient/hpMultiplier` з `HeroScalingOptions` і `DEFAULTS`; нова реалізація:

```ts
const HP_CON_COEFFICIENT = 1.5;

const HP_BASE_LEVELS = 3;

export function getHeroMaxHpBreakdown(level: number, constitution: number, archetype: string | null | undefined): { total: number; breakdown: string[] } {
  const a = heroArchetype(archetype);

  const conMod = getAbilityModifier(constitution);

  const base = HP_BASE_LEVELS * a.hpPerLevel;

  const perLevel = a.hpPerLevel + conMod * HP_CON_COEFFICIENT;

  const total = Math.max(1, Math.floor(base + level * perLevel));

  return {
    total,
    breakdown: [`${a.name}: ${HP_BASE_LEVELS} × ${a.hpPerLevel} + рівень × (${a.hpPerLevel} + мод. ВИТ ${conMod} × ${HP_CON_COEFFICIENT})`, `= ${base} + ${level} × ${perLevel} = ${total}`],
  };
}

export function getHeroMaxHp(level: number, constitution: number, archetype: string | null | undefined): number {
  return getHeroMaxHpBreakdown(level, constitution, archetype).total;
}
```

Оновити шапковий коментар файлу (HP від рівня, ВИТ і архетипу). Прибрати `HERO_SCALING_DEFAULTS`, якщо більше ніде не використовується (`grep`).

- [ ] **Step 5: `hero-hp.ts`:** `return getHeroMaxHpBreakdown(c.level, c.constitution, c.archetype);`. Виправити виклики: `from-character.ts` (`heroBaseHp(character)` — `CharacterFromPrisma` вже має `constitution`, після generate і `archetype`), `build-sheet.ts`, `DmCharacterCard.tsx`.

- [ ] **Step 6: Схема + міграція** `ALTER TABLE "characters" ADD COLUMN "archetype" TEXT;` → `pnpm exec prisma generate`.

- [ ] **Step 7:** `pnpm test:run lib/utils/characters lib/constants app/api/__tests__` → PASS (оновити очікування HP у тестах, що їх фіксували — лише числа, не логіку).

- [ ] **Step 8: Commit** `feat(heroes): archetypes and HP from archetype + constitution`.

### Task 8: Шкода від архетипу замість ручних множників

**Files:**
- Modify: `types/battle.ts:148-150` (`magicMultiplier?: number`, `archetypeName?: string`), `lib/utils/battle/participant/from-character.ts:76-82,131-132`, `lib/utils/battle/damage/hero-dm-multiplier.ts`, `lib/utils/battle/attack/process/compute.ts:146`, `lib/utils/battle/damage/breakdown.ts:84`, `lib/utils/battle/spell/power.ts`, `lib/utils/battle/balance/stats.ts` (`spellDpr`)
- Test: `lib/utils/battle/__tests__/hero-archetype-damage.test.ts`

**Interfaces:**
- Consumes: `heroArchetype` (Task 7).
- Produces: `applyHeroDmDamageMultiplier` повертає `breakdownLine: "× 1.2 (архетип: Воїн) = N"`; `heroMagicMultiplier(p: BattleParticipant): number` (1 для не-героїв) у `hero-dm-multiplier.ts`.

- [ ] **Step 1: Тест.**
  - фабрика учасника-героя (є `lib/utils/battle/__tests__` фікстури — використати наявну, напр. `makeParticipant`; знайти `grep -rn "export function make.*Participant" lib/utils/battle/__tests__`), `abilities: { meleeMultiplier: 1.2, rangedMultiplier: 0.8, magicMultiplier: 0.6, archetypeName: "Воїн" }`:
    - `applyHeroDmDamageMultiplier(p, AttackType.MELEE, 10)` → `{ damage: 12, multiplier: 1.2, breakdownLine: "× 1.2 (архетип: Воїн) = 12" }`;
    - RANGED 10 → 8;
    - юніт → множник 1;
    - знімок старого бою без `magicMultiplier`/`archetypeName` (лише `meleeMultiplier: 1.5`) → MELEE 10 → 15, підпис «(архетип)»;
  - `computeSpellPower({ caster: hero з magicMultiplier 1.25, rolls: [4, 4], … })` → `damage` 10, `heal` 8 (лікування не множиться), у `breakdown` є «× 1.25 (архетип: Маг)»;
  - `createBattleParticipantFromCharacter` з `archetype: "ranger"` і `meleeMultiplier: 3` у рядку БД → `abilities.meleeMultiplier === 0.7`, `rangedMultiplier === 1.25`, `magicMultiplier === 0.7` (ручне значення ігнорується). Мок БД — як у наявних тестах `from-character` (`grep -rln createBattleParticipantFromCharacter lib/utils/battle/__tests__`).

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: `from-character.ts`.** Замінити читання `meleeMultiplier`/`rangedMultiplier` з рядка героя:

```ts
  const archetype = heroArchetype((character as { archetype?: string | null }).archetype);
```

і в `abilities`: `meleeMultiplier: archetype.melee, rangedMultiplier: archetype.ranged, magicMultiplier: archetype.magic, archetypeName: archetype.name`.

- [ ] **Step 4: `hero-dm-multiplier.ts`.** Підпис `breakdownLine: \`× ${mult} (${attacker.abilities.archetypeName ? \`архетип: ${attacker.abilities.archetypeName}\` : "архетип"}) = ${damage}\``. Додати:

```ts
export function heroMagicMultiplier(p: BattleParticipant): number {
  if (p.basicInfo.sourceType !== ParticipantSourceType.CHARACTER) return 1;

  return clampHeroDamageMultiplier(p.abilities.magicMultiplier);
}
```

У `compute.ts:146` і `breakdown.ts:84` мітку кроку `"Коефіцієнт DM"` → `"Архетип"`.

- [ ] **Step 5: `spell/power.ts`.** Після підрахунку:

```ts
  const raw = heal + mods.flat + percentBonus;

  const mult = heroMagicMultiplier(caster);

  const damage = mult === 1 ? raw : Math.floor(raw * mult);

  if (mult !== 1) breakdown.push(`× ${mult} (архетип${caster.abilities.archetypeName ? `: ${caster.abilities.archetypeName}` : ""}) = ${damage}`);

  return { heal, damage, breakdown };
```

- [ ] **Step 6: `balance/stats.ts`.** `const spellDpr = getSpellDprFromBranchLevels(...) * heroMagicMultiplier(participant);` (round1 у лог-рядках лишається).

- [ ] **Step 7:** `pnpm test:run lib/utils/battle` → PASS (числа в тестах, що мокали DM-коефіцієнт, оновити; поведінку балансу для юнітів не чіпати).

- [ ] **Step 8: Commit** `feat(battle): hero damage scales by archetype instead of DM coefficients`.

### Task 9: Архетип у формі, прибрати ручні коефіцієнти

**Files:**
- Modify: `types/characters.ts` (`CharacterFormData.basicInfo.archetype?: string`, видалити `scalingCoefficients`), `lib/utils/characters/character-form.ts:34,80-82,121,145-147`, `lib/hooks/characters/useCharacterForm-bindings.ts` / `useCharacterForm-defaults.ts` (сетер `setArchetype`), `components/characters/basic/CharacterBasicInfo.tsx`, `components/character-profile/BasicEditTab.tsx`, `components/characters/stats/CharacterHpPreview.tsx` (+ його тест), `app/api/campaigns/[id]/characters/[characterId]/update-character-schema.ts:63-65`, `app/api/campaigns/[id]/characters/create-character-schema.ts`, `create-character.ts`, `patch-character.ts`, `components/character-profile/ProfileHero.tsx` (рядок класу), `lib/utils/characters/sheet/build-sheet.ts` (`identity.archetype`)
- Test: `app/api/__tests__/character-patch-fields.test.ts` (доповнити), `lib/utils/characters/__tests__/character-form.test.ts` (якщо є; інакше створити)

**Interfaces:**
- Consumes: `HERO_ARCHETYPE_KEYS`, `HERO_ARCHETYPE_OPTIONS`, `heroArchetype` (Task 7).
- Produces: PATCH/POST приймають `archetype: z.enum(HERO_ARCHETYPE_KEYS).nullable().optional()`; `CharacterSheet.identity.archetype: string` (назва).

- [ ] **Step 1: Тести.**
  - PATCH ДМ `{ archetype: "mage" }` → `update` з `archetype: "mage"`; `{ archetype: "bard" }` → 400;
  - PATCH власник при `allowPlayerEdit: true` з `{ archetype: "mage", name: "Нове" }` → `update` викликано без `archetype` (значення з БД не змінюється), ім'я змінено;
  - `characterToFormData({ archetype: "rogue", … }).basicInfo.archetype === "rogue"`, `formDataToCharacter` повертає `archetype: "rogue"`, а `""` → `null`; у результаті немає `hpMultiplier/meleeMultiplier/rangedMultiplier`.

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Схеми.** У `update-character-schema.ts` замінити три `*Multiplier` на `archetype: z.enum(HERO_ARCHETYPE_KEYS).nullable().optional()`; те саме в `create-character-schema.ts`, і в `create-character.ts` `archetype: data.archetype ?? null`.

- [ ] **Step 4: `patch-character.ts`:** у гілці не-ДМа додати `archetype: undefined` до стрипу (поруч з `level: undefined`).

- [ ] **Step 5: Форма.** `character-form.ts`: `basicInfo.archetype: character.archetype ?? ""`, у payload `archetype: formData.basicInfo.archetype || null`; видалити блок `scalingCoefficients` в обидва боки. `CharacterBasicInfo`: `SelectField id="archetype" label "Архетип"`, `options={HERO_ARCHETYPE_OPTIONS}`, лише коли `!isPlayerView`. Сетер `setArchetype` у bindings/defaults за зразком `setSubclass`.

- [ ] **Step 6: `BasicEditTab`.** Прибрати `Coef`, `setCoef`, обидва `LabeledInput` коефіцієнтів. `CharacterHpPreview` — прибрати prop `coefficient`/`onCoefficientChange` і поле `×`; опис: «Як у бою: рівень, статура, архетип і бонуси. Оновлюється після збереження.» Оновити його тест.

- [ ] **Step 7: Профіль.** `build-sheet.ts`: `identity.archetype: heroArchetype(c.archetype).name`; `ProfileHero` рядок: `{id.level} рів. · {id.archetype} · {id.className}`.

- [ ] **Step 8:** `pnpm test:run app/api/__tests__ lib/utils/characters components/characters components/character-profile` → PASS; `pnpm exec tsc --noEmit`; `pnpm lint`.

- [ ] **Step 9: Commit** `feat(characters): DM picks hero archetype; drop manual multipliers from the form`.

### Task 10: Расові бонуси до шкоди

**Files:**
- Modify: `data/library/race-passives.ts`
- Test: `data/library/__tests__/race-passives-damage.test.ts`

- [ ] **Step 1: Тест.**

```ts
import { describe, expect, it } from "vitest";

import { RACE_PASSIVES } from "@/data/library/race-passives";
import { abilitySchema } from "@/lib/utils/abilities/schema";

const EXPECTED: Record<string, Record<string, number>> = {
  humans: { melee: 10 },
  demons: { melee: 15, ranged: -10 },
  elves: { ranged: 20, melee: -15 },
  "dark-elves": { melee: 15, magic: -10 },
  dwarves: { melee: 10, ranged: -10 },
  necromancers: { magic: 10, melee: -10 },
  mages: { magic: 15, melee: -20 },
};

describe("расові бонуси до шкоди", () => {
  it.each(Object.entries(EXPECTED))("%s", (race, expected) => {
    const style = RACE_PASSIVES[race].trait.find((a) => a.id === `${race}-fighting-style`);

    expect(style).toBeTruthy();
    expect(abilitySchema.safeParse(style).success).toBe(true);
    expect(Object.fromEntries(style!.effects.map((e) => [(e as { filter: { kind: string } }).filter.kind, (e as { percent: number }).percent]))).toEqual(expected);
  });
});
```

Перевірити точну назву експорту схеми здібності в `lib/utils/abilities/schema/index.ts` (`abilitySchema` / `AbilitySchema`) і підставити.

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Дані.** У `trait` кожної раси додати пасивку:

```ts
{ id: "elves-fighting-style", name: "Стиль бою", trigger: { event: "passive" }, effects: [
  { kind: "damageBonus", filter: { kind: "ranged" }, percent: 20 },
  { kind: "damageBonus", filter: { kind: "melee" }, percent: -15 },
] },
```

(відповідно до таблиці `EXPECTED`), а в `description` пасивки дописати речення, напр. «Дальня шкода +20 %, ближня −15 %.».

- [ ] **Step 4:** `pnpm test:run data/library scripts/__tests__` → PASS (сід-тести бібліотеки теж мають пройти).

- [ ] **Step 5: Commit** `feat(races): racial fighting style damage bonuses`.

### Task 11: Прогін балансу і таблиця росту

**Files:**
- Modify: `scripts/balance-library.ts:86-89` (архетипи збірок: `martial` → `warrior`, `caster` → `mage`, `leader` → `ranger`; поле `archetype` у `Build` і в створенні героя ~`:506`)
- Create: `scripts/hero-growth-report.ts`, `docs/reports/hero-growth-2026-10.md`
- Modify: `package.json` (`"hero-growth-report": "tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/hero-growth-report.ts"`), за потреби `lib/constants/hero-archetypes.ts` (корекція відсотків)

- [ ] **Step 1: Збірки балансу** отримують архетип, герой створюється з `archetype: b.archetype`.

- [ ] **Step 2: Скрипт таблиці.** Для кожної раси з кампанії «SIM: баланс бібліотеки» (локальна БД, `pnpm db:local`, сід — `pnpm seed-library` якщо кампанії немає) × кожного архетипу × рівнів 1, 3, 6, 10, 15: будувати героя в пам'яті (`campaignId` SIM, `race` = назва раси, `archetype`, характеристики: основна атаки 14 (СИЛ для ближнього, СПР для дальнього, ІНТ для мага), ВИТ 12, інші 10, без навичок і артефактів, `inventory: null`) → `createBattleParticipantFromCharacter(fake, "", ParticipantSide.ALLY)`; рахувати:
  - HP = `p.combatStats.maxHp`;
  - ближній/дальній = `averageAttackDamage(p, { name: "", type, attackBonus: 0, damageDice: "1d8", damageType: "physical" } as BattleAttack, [p]).total`;
  - магія: `const d = casterSpellDice(p, { dice: 8, groupId: null })`, `computeSpellPower({ caster: p, groupId: null, rolls: Array(d.count).fill((d.sides + 1) / 2), participants: [p] }).damage`.
  Вивести markdown: для кожного архетипу таблиця «Раса | Рів. 1 | 3 | 6 | 10 | 15», клітинка `HP / ближ / даль / маг`; у шапці — припущення. Писати в `docs/reports/hero-growth-2026-10.md` і в stdout.

- [ ] **Step 3: Прогін балансу.** `pnpm balance-library --runs=6 --levels=3,6,10 --parties=martial,caster,leader` до (на `main`, `git stash` не потрібен — запустити в окремому worktree або записати попередні числа з `docs/reports`) і після. Критерій: жоден архетип не сильніший за середній більш ніж на ~15 % за `HP × DPR` з таблиці; win-rate партій не відходить від попереднього більш ніж на 15 п.п. Якщо ні — скоригувати відсотки в `hero-archetypes.ts` (і тести Task 7), повторити.

- [ ] **Step 4:** Підсумок (таблиця росту + результати балансу до/після + внесені корекції) — у `docs/reports/hero-growth-2026-10.md`; оновити таблицю архетипів у спеці, якщо цифри змінились.

- [ ] **Step 5:** `pnpm test:run` повністю, `pnpm lint`, `pnpm build` → зелені.

- [ ] **Step 6: Commit** `docs(balance): hero growth table and archetype balance check`.

---

## Після злиття

- Створити бакет `avatars` не потрібно вручну — `ensureBucket` створює його при першому завантаженні.
- На проді: перепрогнати `pnpm seed-library` для кампанії, щоб у раси потрапили нові пасивки «Стиль бою».
- Оновити `CLAUDE.md`/`ARCHITECTURE.md`: архетипи замість DM-коефіцієнтів, аватари в Storage, жетони в листі героя.
