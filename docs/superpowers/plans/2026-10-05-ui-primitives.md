# Shared UI Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ResponsiveDialog (modal on desktop, `vaul` bottom sheet on phones), `useConfirm`, page states and a mobile ActionBar — and every existing dialog, confirm, list state and form footer moved onto them.

**Architecture:** Low-level primitives live in `components/ui` (`responsive-dialog`, `confirm-dialog`), composed ones in `components/common` (`states/`, `ActionBar`). Mobile/desktop switching is JS (`useIsMobile`, server = desktop) for the dialog; ActionBar is pure CSS (`sm:` breakpoint). ESLint forbids bypassing them.

**Tech Stack:** Next.js 16, React 19, Radix Dialog, `vaul` 1.1.x (new), Tailwind 4, TanStack Query 5, Vitest + happy-dom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-05-ui-primitives-design.md`

## Global Constraints

- Phone = `(max-width: 639px)` (Tailwind `sm` is 640px); server render = desktop.
- `vaul` ^1.1.2 is the only new dependency; install with `pnpm add vaul` (lockfile committed — Vercel runs `--frozen-lockfile`).
- Dialog layers stay `z-50` (overlay and content); no `z-[100]`/`z-[110]` on dialog content.
- All UI copy in Ukrainian; identifiers in English; minimal comments (one compact line, only "why").
- Components never import `@/lib/api/*` in new code (user layering rule); no `console.log`.
- ESLint: `simple-import-sort`, `padding-line-between-statements`, `react-hooks/exhaustive-deps` = error; run `pnpm exec eslint --fix <paths>` after edits.
- Tests needing DOM start with `// @vitest-environment happy-dom` and call `afterEach(cleanup)`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A `<form>` whose submit button moves into `footer`** — the footer renders outside the form, so Enter/submit must still work via `form="<id>"` on the button (test in Task 6 on `CreateRaceDialog`).
2. **Nested dialog on a phone** (ability template picker inside «Створити расу») opens on top as a nested sheet and closing it keeps the parent open (test in Task 2).
3. **`useConfirm` while a previous confirm is open / provider unmounted mid-flight** — the earlier promise resolves `false`, never hangs (test in Task 3).
4. **Radix Select/Dropdown inside a sheet** opens above the sheet (same `z-50`, portaled later) and does not close the sheet on pick (test in Task 2).
5. **Existing tests that stub `window.confirm`** (e.g. `UnitCard.test.tsx`) must be rewritten to click the confirm dialog, not silently pass (Task 7).

---

### Task 1: `vaul`, `useIsMobile`, test helpers

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (via `pnpm add vaul`)
- Create: `lib/hooks/common/useIsMobile.ts`, `components/ui/__tests__/match-media.ts`
- Modify: `lib/hooks/common/index.ts` (export)
- Test: `lib/hooks/common/__tests__/useIsMobile.test.tsx`

**Interfaces:**
- Produces: `useIsMobile(): boolean`; `MOBILE_QUERY = "(max-width: 639px)"`; test helper `mockMatchMedia(isMobile: boolean): { set(next: boolean): void }`.

- [ ] **Step 1: Install**

Run: `pnpm add vaul@^1.1.2`
Expected: `vaul` in `dependencies`, lockfile updated.

- [ ] **Step 2: Test helper** — `components/ui/__tests__/match-media.ts`

```ts
type Listener = (e: MediaQueryListEvent) => void;

export function mockMatchMedia(isMobile: boolean) {
  let matches = isMobile;

  const listeners = new Set<Listener>();

  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("max-width") ? matches : !matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
    addListener: (l: Listener) => listeners.add(l),
    removeListener: (l: Listener) => listeners.delete(l),
    dispatchEvent: () => true,
  })) as unknown as typeof window.matchMedia;

  return {
    set(next: boolean) {
      matches = next;
      for (const l of listeners) l({ matches: next } as MediaQueryListEvent);
    },
  };
}
```

- [ ] **Step 3: Failing test** — `lib/hooks/common/__tests__/useIsMobile.test.tsx`

```tsx
// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { useIsMobile } from "@/lib/hooks/common/useIsMobile";

describe("useIsMobile", () => {
  it("повертає стан media query і реагує на зміну", () => {
    const mm = mockMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
    act(() => mm.set(false));
    expect(result.current).toBe(false);
  });
});
```

Run: `pnpm test:run lib/hooks/common/__tests__/useIsMobile.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 4: Implement** — `lib/hooks/common/useIsMobile.ts`

```ts
import { useSyncExternalStore } from "react";

export const MOBILE_QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);

  mql.addEventListener("change", onChange);

  return () => mql.removeEventListener("change", onChange);
}

// server and first hydration pass render the desktop variant
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
}
```

Add `export { MOBILE_QUERY, useIsMobile } from "./useIsMobile";` to `lib/hooks/common/index.ts`.

- [ ] **Step 5: PASS, commit**

```bash
pnpm test:run lib/hooks/common && pnpm exec tsc --noEmit -p . && git add -A && git commit -m "feat(ui): vaul dependency and useIsMobile"
```

---

### Task 2: `ResponsiveDialog`

**Files:**
- Create: `components/ui/responsive-dialog.tsx`
- Test: `components/ui/__tests__/responsive-dialog.test.tsx`

**Interfaces:**
- Consumes: `useIsMobile` (Task 1), `Dialog*` from `components/ui/dialog.tsx`, `Drawer` from `vaul`.
- Produces:

```ts
export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
  className?: string; // content element
  children?: ReactNode;
}
export function ResponsiveDialog(props: ResponsiveDialogProps): JSX.Element;
```

- [ ] **Step 1: Failing tests** — `components/ui/__tests__/responsive-dialog.test.tsx`

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "./match-media";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

const base = { open: true, onOpenChange: vi.fn(), title: "Додати вміння", description: "Опис", footer: <Button>Зберегти</Button> };

describe("ResponsiveDialog", () => {
  afterEach(cleanup);

  it("десктоп: модалка з заголовком, футером і ✕", () => {
    mockMatchMedia(false);
    render(<ResponsiveDialog {...base}>вміст</ResponsiveDialog>);

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Додати вміння");
    expect(screen.getByRole("button", { name: "Закрити" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Зберегти" })).toBeInTheDocument();
    expect(document.querySelector("[data-slot=sheet]")).toBeNull();
  });

  it("телефон: шторка з ручкою і прилиплим футером", () => {
    mockMatchMedia(true);
    render(<ResponsiveDialog {...base}>вміст</ResponsiveDialog>);

    expect(document.querySelector("[data-slot=sheet]")).not.toBeNull();
    expect(document.querySelector("[data-slot=sheet-handle]")).not.toBeNull();
    expect(document.querySelector("[data-slot=sheet-footer]")?.className).toContain("safe-area-inset-bottom");
    expect(screen.getByText("Додати вміння")).toBeInTheDocument();
  });

  it.each([false, true])("dismissible=false не закривається Escape (mobile=%s)", (mobile) => {
    mockMatchMedia(mobile);

    const onOpenChange = vi.fn();

    render(<ResponsiveDialog {...base} onOpenChange={onOpenChange} dismissible={false}>вміст</ResponsiveDialog>);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("телефон: вкладений діалог відкривається поверх, закриття не закриває батьківський", () => {
    mockMatchMedia(true);

    function Nested() {
      const [inner, setInner] = useState(false);

      const [outer, setOuter] = useState(true);

      return (
        <ResponsiveDialog open={outer} onOpenChange={setOuter} title="Раса">
          <Button onClick={() => setInner(true)}>Шаблони</Button>
          <ResponsiveDialog open={inner} onOpenChange={setInner} title="Шаблони вмінь">
            <Button onClick={() => setInner(false)}>Готово</Button>
          </ResponsiveDialog>
        </ResponsiveDialog>
      );
    }

    render(<Nested />);
    fireEvent.click(screen.getByRole("button", { name: "Шаблони" }));
    expect(screen.getByText("Шаблони вмінь")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    expect(screen.queryByText("Шаблони вмінь")).toBeNull();
    expect(screen.getByText("Раса")).toBeInTheDocument();
  });

  it("телефон: вибір у Select всередині шторки не закриває її", async () => {
    mockMatchMedia(true);

    const onOpenChange = vi.fn();

    function WithSelect() {
      const [v, setV] = useState("a");

      return (
        <ResponsiveDialog {...base} onOpenChange={onOpenChange}>
          <SelectField id="s" value={v} onValueChange={setV} options={[{ value: "a", label: "А" }, { value: "b", label: "Б" }]} />
        </ResponsiveDialog>
      );
    }

    render(<WithSelect />);
    fireEvent.pointerDown(screen.getByRole("combobox"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "Б" }));

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("combobox")).toHaveTextContent("Б");
  });
});
```

Run: `pnpm test:run components/ui/__tests__/responsive-dialog.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement** — `components/ui/responsive-dialog.tsx`

```tsx
"use client";

import { createContext, type ReactNode, useContext } from "react";
import { Drawer } from "vaul";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/lib/hooks/common/useIsMobile";
import { cn } from "@/lib/utils";

const SIZE_CLASS = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" } as const;

const InsideSheet = createContext(false);

export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZE_CLASS;
  dismissible?: boolean;
  className?: string;
  children?: ReactNode;
}

export function ResponsiveDialog({ open, onOpenChange, title, description, footer, size = "md", dismissible = true, className, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  const nested = useContext(InsideSheet);

  const handleOpenChange = (next: boolean) => {
    if (!next && !dismissible) return;

    onOpenChange(next);
  };

  if (isMobile) {
    const Root = nested ? Drawer.NestedRoot : Drawer.Root;

    return (
      <Root open={open} onOpenChange={handleOpenChange} dismissible={dismissible}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Drawer.Content data-slot="sheet" className={cn("fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-xl border-t bg-background outline-none", className)}>
            <div data-slot="sheet-handle" aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
            <div className="space-y-1 px-4 pt-3 pb-2">
              <Drawer.Title className="text-lg font-semibold leading-tight">{title}</Drawer.Title>
              {description ? <Drawer.Description className="text-sm text-muted-foreground">{description}</Drawer.Description> : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <InsideSheet.Provider value={true}>{children}</InsideSheet.Provider>
            </div>
            {footer ? (
              <div data-slot="sheet-footer" className="flex gap-2 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>*]:flex-1">
                {footer}
              </div>
            ) : null}
          </Drawer.Content>
        </Drawer.Portal>
      </Root>
    );
  }

  const block = (e: Event) => {
    if (!dismissible) e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("flex flex-col overflow-hidden", SIZE_CLASS[size], className)}
        showCloseButton={dismissible}
        onEscapeKeyDown={block}
        onInteractOutside={block}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">{children}</div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: PASS** — `pnpm test:run components/ui` — Expected: all pass. If vaul needs browser APIs missing in happy-dom (e.g. `getComputedStyle(...).transform` or `ResizeObserver`), add the minimal stub to the test file (not to production code) and ledger it as a ruling.

- [ ] **Step 4: Commit**

```bash
pnpm exec eslint --fix components/ui && pnpm exec tsc --noEmit -p . && git add -A && git commit -m "feat(ui): ResponsiveDialog — modal on desktop, vaul sheet on phones"
```

---

### Task 3: `useConfirm` + `ConfirmProvider`

**Files:**
- Create: `lib/hooks/common/confirm-context.ts`, `lib/hooks/common/useConfirm.ts`, `components/ui/confirm-dialog.tsx`, `components/ui/__tests__/render-with-confirm.tsx`
- Modify: `lib/hooks/common/index.ts`, `app/layout.tsx`
- Test: `components/ui/__tests__/confirm-dialog.test.tsx`

**Interfaces:**
- Consumes: `ResponsiveDialog` (Task 2).
- Produces:

```ts
export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string; // «Підтвердити»
  cancelLabel?: string;  // «Скасувати»
  destructive?: boolean;
  onConfirm?: () => Promise<unknown>;
}
export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
export function useConfirm(): ConfirmFn;              // throws outside ConfirmProvider
export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element;
export function renderWithConfirm(ui: ReactElement): RenderResult; // test helper
```

- [ ] **Step 1: Failing tests** — `components/ui/__tests__/confirm-dialog.test.tsx`

```tsx
// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mockMatchMedia } from "./match-media";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { type ConfirmFn, useConfirm } from "@/lib/hooks/common";

let confirm: ConfirmFn;

function Grab() {
  confirm = useConfirm();

  return null;
}

const mount = () => render(<ConfirmProvider><Grab /></ConfirmProvider>);

describe("useConfirm", () => {
  beforeEach(() => mockMatchMedia(false));
  afterEach(cleanup);

  it("«Видалити» → true, «Скасувати» → false", async () => {
    mount();

    let p!: Promise<boolean>;

    act(() => {
      p = confirm({ title: "Видалити артефакт?", confirmLabel: "Видалити", destructive: true });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));
    await expect(p).resolves.toBe(true);

    act(() => {
      p = confirm({ title: "Ще раз?" });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Скасувати" }));
    await expect(p).resolves.toBe(false);
  });

  it("Escape → false", async () => {
    mount();

    let p!: Promise<boolean>;

    act(() => {
      p = confirm({ title: "Вийти?" });
    });
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    await expect(p).resolves.toBe(false);
  });

  it("другий виклик скасовує перший", async () => {
    mount();

    let first!: Promise<boolean>;

    act(() => {
      first = confirm({ title: "Перше" });
    });
    act(() => {
      void confirm({ title: "Друге" });
    });

    await expect(first).resolves.toBe(false);
    expect(await screen.findByText("Друге")).toBeInTheDocument();
  });

  it("onConfirm з помилкою лишає діалог відкритим із текстом; повтор з успіхом → true", async () => {
    mount();

    let attempt = 0;

    let p!: Promise<boolean>;

    act(() => {
      p = confirm({ title: "Видалити?", confirmLabel: "Видалити", onConfirm: async () => {
        attempt++;
        if (attempt === 1) throw new Error("Сервер недоступний");
      } });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Сервер недоступний");
    fireEvent.click(screen.getByRole("button", { name: "Видалити" }));
    await expect(p).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("розмонтування провайдера з відкритим підтвердженням → false", async () => {
    const { unmount } = mount();

    let p!: Promise<boolean>;

    act(() => {
      p = confirm({ title: "Видалити?" });
    });
    unmount();
    await expect(p).resolves.toBe(false);
  });

  it("поза провайдером — зрозуміла помилка", () => {
    expect(() => render(<Grab />)).toThrow(/ConfirmProvider/);
  });
});
```

Run: `pnpm test:run components/ui/__tests__/confirm-dialog.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement**

`lib/hooks/common/confirm-context.ts`:

```ts
import { createContext, type ReactNode } from "react";

export interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => Promise<unknown>;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);
```

`lib/hooks/common/useConfirm.ts`:

```ts
import { useContext } from "react";

import { type ConfirmFn, ConfirmContext } from "./confirm-context";

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);

  if (!confirm) throw new Error("useConfirm потребує ConfirmProvider (підключений в app/layout.tsx)");

  return confirm;
}
```

`lib/hooks/common/index.ts` — add:

```ts
export { type ConfirmFn, ConfirmContext, type ConfirmOptions } from "./confirm-context";
export { useConfirm } from "./useConfirm";
```

`components/ui/confirm-dialog.tsx`:

```tsx
"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ConfirmContext, type ConfirmOptions } from "@/lib/hooks/common/confirm-context";

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const current = useRef<Pending | null>(null);

  const settle = useCallback((ok: boolean) => {
    current.current?.resolve(ok);
    current.current = null;
    setPending(null);
    setBusy(false);
    setError(null);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        current.current?.resolve(false);

        const next = { ...options, resolve };

        current.current = next;
        setBusy(false);
        setError(null);
        setPending(next);
      }),
    [],
  );

  useEffect(() => () => current.current?.resolve(false), []);

  const accept = async () => {
    const p = current.current;

    if (!p) return;

    if (!p.onConfirm) return settle(true);

    setBusy(true);
    setError(null);

    try {
      await p.onConfirm();

      if (current.current === p) settle(true);
    } catch (e) {
      if (current.current !== p) return;

      setBusy(false);
      setError(e instanceof Error && e.message ? e.message : "Не вдалося виконати дію");
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ResponsiveDialog
        open={pending !== null}
        onOpenChange={(open) => !open && settle(false)}
        title={pending?.title ?? ""}
        description={pending?.description}
        size="sm"
        dismissible={!busy}
        footer={
          <>
            <Button variant="outline" onClick={() => settle(false)} disabled={busy}>
              {pending?.cancelLabel ?? "Скасувати"}
            </Button>
            <Button variant={pending?.destructive ? "destructive" : "default"} onClick={accept} disabled={busy}>
              {busy ? "…" : (pending?.confirmLabel ?? "Підтвердити")}
            </Button>
          </>
        }
      >
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </ResponsiveDialog>
    </ConfirmContext.Provider>
  );
}
```

`components/ui/__tests__/render-with-confirm.tsx`:

```tsx
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";

export const renderWithConfirm = (ui: ReactElement) => render(<ConfirmProvider>{ui}</ConfirmProvider>);
```

`app/layout.tsx`: wrap inside `QueryProvider`:

```tsx
        <QueryProvider>
          <ConfirmProvider>
            <BackgroundImage />
            <Header />
            <PageTransition>{children}</PageTransition>
          </ConfirmProvider>
        </QueryProvider>
```

with `import { ConfirmProvider } from "@/components/ui/confirm-dialog";`.

- [ ] **Step 3: PASS, commit**

```bash
pnpm test:run components/ui lib/hooks/common && pnpm exec eslint --fix components/ui lib/hooks/common app/layout.tsx && pnpm exec tsc --noEmit -p . && git add -A && git commit -m "feat(ui): useConfirm with ConfirmProvider"
```

---

### Task 4: Page states

**Files:**
- Create: `components/common/states/{EmptyState,LoadingState,ErrorState,QueryState,index}.tsx` (index is `.ts`)
- Test: `components/common/__tests__/states.test.tsx`

**Interfaces:**
- Produces:

```ts
EmptyState({ icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string })
LoadingState({ rows?: number /* 3 */; label?: string /* «Завантаження…» */; className?: string })
ErrorState({ error: unknown; onRetry?: () => void; className?: string })
QueryState<T>({ query: Pick<UseQueryResult<T>, "data" | "isPending" | "isError" | "error" | "refetch">; loading?: ReactNode; empty?: ReactNode; children: (data: T) => ReactNode })
```

- [ ] **Step 1: Failing tests** — `components/common/__tests__/states.test.tsx`

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Swords } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EmptyState, ErrorState, LoadingState, QueryState } from "@/components/common/states";
import { ApiError } from "@/lib/api/client";

const q = <T,>(over: Partial<{ data: T; isPending: boolean; isError: boolean; error: unknown }>) => ({
  data: undefined as T | undefined,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...over,
}) as never;

describe("стани сторінки", () => {
  afterEach(cleanup);

  it("EmptyState: заголовок, опис, дія", () => {
    render(<EmptyState icon={Swords} title="Ще немає боїв" description="Створіть перший" action={<button>Новий бій</button>} />);

    expect(screen.getByText("Ще немає боїв")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новий бій" })).toBeInTheDocument();
  });

  it("LoadingState: N рядків-скелетонів і aria-busy", () => {
    const { container } = render(<LoadingState rows={4} label="Завантаження скілів…" />);

    expect(container.querySelectorAll("[data-slot=skeleton-row]")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Завантаження скілів…")).toHaveClass("sr-only");
  });

  it("ErrorState: текст ApiError і повтор", () => {
    const onRetry = vi.fn();

    render(<ErrorState error={new ApiError("Немає доступу", 403, "/x")} onRetry={onRetry} />);
    expect(screen.getByText("Немає доступу")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще раз" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("ErrorState: невідома помилка — загальний текст", () => {
    render(<ErrorState error={42} />);
    expect(screen.getByText("Щось пішло не так")).toBeInTheDocument();
  });

  it("QueryState: усі гілки", () => {
    const child = (d: string[]) => <p>дані: {d.join(",")}</p>;

    const { rerender } = render(<QueryState query={q({ isPending: true })} loading={<p>вантажу</p>}>{child}</QueryState>);

    expect(screen.getByText("вантажу")).toBeInTheDocument();

    rerender(<QueryState query={q({ isError: true, error: new Error("збій") })}>{child}</QueryState>);
    expect(screen.getByText("збій")).toBeInTheDocument();

    rerender(<QueryState query={q({ data: [] })} empty={<p>порожньо</p>}>{child}</QueryState>);
    expect(screen.getByText("порожньо")).toBeInTheDocument();

    rerender(<QueryState query={q({ data: ["a", "b"] })} empty={<p>порожньо</p>}>{child}</QueryState>);
    expect(screen.getByText("дані: a,b")).toBeInTheDocument();
  });
});
```

Run: `pnpm test:run components/common/__tests__/states.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement**

`components/common/states/EmptyState.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action, className }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center", className)}>
      {Icon ? <Icon className="size-8 text-muted-foreground" aria-hidden /> : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2 w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">{action}</div> : null}
    </div>
  );
}
```

`components/common/states/LoadingState.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function LoadingState({ rows = 3, label = "Завантаження…", className }: { rows?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-2", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} data-slot="skeleton-row" className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
```

`components/common/states/ErrorState.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const messageOf = (error: unknown) => (error instanceof Error && error.message ? error.message : "Щось пішло не так");

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-lg border border-destructive/40 px-4 py-8 text-center", className)}>
      <p className="text-sm text-destructive">{messageOf(error)}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="w-full sm:w-auto">
          Спробувати ще раз
        </Button>
      ) : null}
    </div>
  );
}
```

`components/common/states/QueryState.tsx`:

```tsx
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

type QueryLike<T> = Pick<UseQueryResult<T>, "data" | "isPending" | "isError" | "error" | "refetch">;

export function QueryState<T>({ query, loading, empty, children }: { query: QueryLike<T>; loading?: ReactNode; empty?: ReactNode; children: (data: T) => ReactNode }) {
  if (query.isPending) return <>{loading ?? <LoadingState />}</>;

  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data as T;

  if (empty !== undefined && Array.isArray(data) && data.length === 0) return <>{empty}</>;

  return <>{children(data)}</>;
}
```

`components/common/states/index.ts`:

```ts
export { EmptyState } from "./EmptyState";
export { ErrorState } from "./ErrorState";
export { LoadingState } from "./LoadingState";
export { QueryState } from "./QueryState";
```

- [ ] **Step 3: PASS, commit**

```bash
pnpm test:run components/common && pnpm exec eslint --fix components/common && pnpm exec tsc --noEmit -p . && git add -A && git commit -m "feat(ui): EmptyState, LoadingState, ErrorState, QueryState"
```

---

### Task 5: `ActionBar` + `FormCard.submitDisabled`

**Files:**
- Create: `components/common/ActionBar.tsx`
- Modify: `components/common/FormCard.tsx`, `components/races/RaceEditForm.tsx`
- Test: `components/common/__tests__/ActionBar.test.tsx`

**Interfaces:**
- Produces: `ActionBar({ children: ReactNode; className?: string })`; `FormCard` new prop `submitDisabled?: boolean`.

- [ ] **Step 1: Failing tests** — `components/common/__tests__/ActionBar.test.tsx`

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionBar } from "@/components/common/ActionBar";
import { FormCard } from "@/components/common/FormCard";

describe("ActionBar", () => {
  afterEach(cleanup);

  it("на телефоні прилипає донизу з safe-area, з sm — звичайний рядок", () => {
    render(<ActionBar><button>Зберегти</button></ActionBar>);

    const bar = screen.getByRole("button", { name: "Зберегти" }).parentElement as HTMLElement;

    expect(bar.dataset.slot).toBe("action-bar");
    expect(bar.className).toMatch(/(^| )sticky( |$)/);
    expect(bar.className).toContain("safe-area-inset-bottom");
    expect(bar.className).toContain("sm:static");
  });

  it("FormCard: submitDisabled вимикає кнопку, але підпис не «Збереження...»", () => {
    render(<FormCard title="Раса" onSubmit={vi.fn()} submitLabel="Зберегти" submitDisabled>поля</FormCard>);

    const btn = screen.getByRole("button", { name: "Зберегти" });

    expect(btn).toBeDisabled();
    expect(screen.queryByText("Збереження...")).toBeNull();
  });
});
```

Run: `pnpm test:run components/common/__tests__/ActionBar.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement** — `components/common/ActionBar.tsx`

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="action-bar"
      className={cn(
        "sticky bottom-0 z-10 -mx-4 flex gap-2 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur [&>*]:flex-1",
        "sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-4 sm:pb-0 sm:backdrop-blur-none sm:[&>*]:flex-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

`components/common/FormCard.tsx`: add `submitDisabled?: boolean` to props (destructure with default `false`), replace the `<div className="flex gap-2 pt-4">…</div>` block with:

```tsx
          <ActionBar>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || submitDisabled}>
              {isSubmitting ? "Збереження..." : submitLabel}
            </Button>
          </ActionBar>
```

(import `ActionBar` from `./ActionBar`; the main action is now last).

`components/races/RaceEditForm.tsx`: `isSubmitting={updateRaceMutation.isPending || !abilitiesValid}` → `isSubmitting={updateRaceMutation.isPending}` + `submitDisabled={!abilitiesValid}`.

- [ ] **Step 3: PASS, commit**

```bash
pnpm test:run components && pnpm exec eslint --fix components/common components/races && pnpm exec tsc --noEmit -p . && git add -A && git commit -m "feat(ui): ActionBar; FormCard submitDisabled"
```

---

### Task 6: Move dialogs onto `ResponsiveDialog`

**Files (Modify):** `components/battle/dialogs/shared/BattleDialog.tsx`, `components/battle/dialogs/{DamageSummaryContent,DamageSummaryModal,SpellResultModal,SpellDialog}.tsx`, `components/main-skills/CreateMainSkillDialog.tsx`, `components/skill-tree/ui/SkillDialogs.tsx`, `components/abilities/AbilityTemplatePicker.tsx`, `components/units/dialogs/{CreateGroupDialog,DeleteAllUnitsDialog}.tsx`, `components/common/{ImportDialog,AbbreviationsInfoDialog}.tsx`, `components/spells/list/SpellLevelAccordion.tsx`, `components/spells/dialogs/{DeleteAllSpellsDialog,RenameGroupDialog,RemoveAllSpellsDialog}.tsx`, `components/skills/dialogs/CreateGroupDialog.tsx`, `components/campaigns/settings/CampaignSettingsDialog.tsx`, `components/campaigns/join/JoinCampaignDialog.tsx`, `components/characters/artifacts/CharacterSpellbookDialog.tsx`, `components/races/CreateRaceDialog.tsx`
- Test: `components/races/__tests__/CreateRaceDialog.test.tsx` (new), existing tests of these components stay green.

**Interfaces:** Consumes `ResponsiveDialog` (Task 2). `BattleDialog` keeps its props (`open`, `onOpenChange`, `title?`, `description?`, `contentClassName?`, `children`).

**Recipe** (apply to each file):

```tsx
// before
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>T</DialogTitle>
      <DialogDescription>D</DialogDescription>
    </DialogHeader>
    BODY
    <DialogFooter>BUTTONS</DialogFooter>
  </DialogContent>
</Dialog>

// after
<ResponsiveDialog open={open} onOpenChange={setOpen} title="T" description="D" size="lg" footer={BUTTONS}>
  BODY
</ResponsiveDialog>
```

- Size: `max-w-sm`/`md` → `sm`; `max-w-lg` or none → `md`; `max-w-xl` and wider → `lg`. Drop `max-h-*`, `overflow-*`, `z-*` from `className`; keep other classes.
- `DialogTrigger` → controlled: `const [open, setOpen] = useState(false)` + the trigger becomes a normal `Button onClick={() => setOpen(true)}` rendered next to the dialog.
- Buttons in a body row at the end (e.g. `<div className="flex justify-end gap-2">`) move to `footer`.
- **Forms:** if the footer buttons submit a `<form>`, give the form an `id` and the submit button `form="<id>"` (footer renders outside the form).
- No title in the source → pass `title={<span className="sr-only">{fallback}</span>}` with a meaningful Ukrainian fallback.
- `BattleDialog` becomes:

```tsx
export function BattleDialog({ open, onOpenChange, title, description, contentClassName, children }: BattleDialogProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={title ?? <span className="sr-only">Дія в бою</span>} description={description} size="sm" className={contentClassName}>
      {children}
    </ResponsiveDialog>
  );
}
```

- [ ] **Step 1: Failing test** — `components/races/__tests__/CreateRaceDialog.test.tsx`

```tsx
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateRaceDialog } from "@/components/races/CreateRaceDialog";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";

vi.mock("@/lib/hooks/skills", () => ({ useMainSkills: () => ({ data: [] }) }));

describe("CreateRaceDialog", () => {
  afterEach(cleanup);

  it.each([false, true])("кнопка у футері сабмітить форму (mobile=%s)", (mobile) => {
    mockMatchMedia(mobile);

    const onCreateRace = vi.fn();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <CreateRaceDialog open onOpenChange={vi.fn()} campaignId="c1" onCreateRace={onCreateRace} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText(/Назва раси/), { target: { value: "Гном" } });
    fireEvent.click(screen.getByRole("button", { name: "Створити расу" }));

    expect(onCreateRace).toHaveBeenCalledWith(expect.objectContaining({ name: "Гном" }));
    if (mobile) expect(document.querySelector("[data-slot=sheet-footer]")).not.toBeNull();
  });
});
```

Run: `pnpm test:run components/races/__tests__/CreateRaceDialog.test.tsx` — Expected: FAIL on mobile (no sheet footer).

- [ ] **Step 2: Migrate** every file in the list with the recipe.

- [ ] **Step 3: Verify nothing still imports the raw dialog**

Run: `grep -rl "@/components/ui/dialog" components app | grep -v "^components/ui/"`
Expected: no output.

- [ ] **Step 4: PASS, commit**

```bash
pnpm test:run components app && pnpm exec eslint --fix components app && pnpm exec tsc --noEmit -p . && git add -A && git commit -m "refactor(ui): all dialogs use ResponsiveDialog"
```

---

### Task 7: Confirms onto `useConfirm`

**Files (Modify):**
- native `confirm()`: `components/battle/panels/{BattleLogPanel,DmParticipantRow}.tsx`, `components/artifacts/{ArtifactForm,ArtifactDeleteButton}.tsx`, `components/units/list/UnitCard.tsx`, `components/campaigns/members/CampaignMembersList.tsx`, `components/artifact-sets/ArtifactSetForm.tsx`, `app/campaigns/[id]/character/character-view-client.tsx`, `app/campaigns/[id]/dm/main-skills/page-client.tsx`, `app/campaigns/[id]/dm/units/[unitId]/page.tsx`, `app/campaigns/[id]/dm/battles/[battleId]/useEditBattleData.ts`, `app/campaigns/[id]/dm/spells/[spellId]/page.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/{DmCharacterEditFormAccordion,DmCharacterEditForm}.tsx`, `app/campaigns/[id]/dm/races/page-client.tsx`
- `AlertDialog`: `components/battle/BattleHeader.tsx`, `components/artifacts/DeleteAllArtifactsButton.tsx`, `components/skills/list/SkillCardDeleteDialog.tsx`, `app/campaigns/[id]/dm/skills/__dialogs__/DeleteAllSkillsDialog.tsx`, `app/campaigns/[id]/dm/characters/__dialogs__/{DeleteCharacterDialog,DeleteAllCharactersDialog}.tsx`, `app/campaigns/[id]/dm/battles/page-client.tsx` → `useConfirm`; `components/battle/dialogs/CounterAttackResultDialog.tsx` → `ResponsiveDialog` (it is a result, not a question)
- Delete: `components/ui/alert-dialog.tsx` once `grep -rl "alert-dialog" components app` is empty
- Test: rewrite `components/units/__tests__/UnitCard.test.tsx`; tests that render migrated components use `renderWithConfirm`.

**Recipe:**

```tsx
// before
if (!confirm("Ви впевнені, що хочете видалити цього юніта?")) return;
deleteUnit.mutate(id);

// after
const confirm = useConfirm();
…
if (!(await confirm({ title: "Видалити юніта?", description: "Цю дію не можна скасувати.", confirmLabel: "Видалити", destructive: true }))) return;
deleteUnit.mutate(id);
```

- Handlers become `async`. In hooks (`useEditBattleData.ts`) call `useConfirm()` in the hook body.
- AlertDialog components that only render a confirm UI for a trigger become a button whose `onClick` awaits `confirm(...)`; keep the component's public props, drop its internal `open` state. When the delete is a mutation the caller waits for, pass `onConfirm: () => mutation.mutateAsync(...)` so errors show in the dialog.

- [ ] **Step 1: Rewrite the failing test** — `components/units/__tests__/UnitCard.test.tsx` delete describe:

```tsx
  it("не видаляє юніт, якщо користувач скасував підтвердження", async () => {
    const onDelete = vi.fn();

    render(<UnitCard unit={unit} campaignId="c1" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити юніт Гоблін" }));
    fireEvent.click(await screen.findByRole("button", { name: "Скасувати" }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("видаляє юніт після підтвердження", async () => {
    const onDelete = vi.fn();

    render(<UnitCard unit={unit} campaignId="c1" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити юніт Гоблін" }));
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("unit-1"));
  });
```

with the file's `render` helper wrapping `<QueryClientProvider><ConfirmProvider>{ui}</ConfirmProvider></QueryClientProvider>`, `mockMatchMedia(false)` in `beforeEach`, and the `vi.stubGlobal("confirm", …)` lines removed.

Run: `pnpm test:run components/units` — Expected: FAIL (no confirm dialog yet).

- [ ] **Step 2: Migrate** all files with the recipe.

- [ ] **Step 3: Verify**

Run: `grep -rnE "(^|[^.a-zA-Z])confirm\(" components app lib/hooks | grep -v "await confirm(\|useConfirm\|__tests__"` — Expected: no output.
Run: `grep -rl "alert-dialog" components app` — Expected: no output → delete `components/ui/alert-dialog.tsx`.

- [ ] **Step 4: PASS, commit**

```bash
pnpm test:run && pnpm exec eslint --fix components app lib && pnpm exec tsc --noEmit -p . && git add -A && git commit -m "refactor(ui): confirms use useConfirm; drop AlertDialog"
```

---

### Task 8: Page states in DM lists, campaigns list, route loaders

**Files (Modify):** `app/campaigns/[id]/dm/{battles,characters,main-skills,races,skills,spells,units}/page-client.tsx`, `app/campaigns/[id]/dm/artifacts/page.tsx`, `app/campaigns/[id]/dm/artifact-sets/page.tsx`, `app/campaigns/page.tsx`, `app/campaigns/[id]/{character,dm,character/edit,battles/[battleId]}/loading.tsx`, `app/campaigns/[id]/battles/[battleId]/BattlePageLoadingState.tsx`
- Test: `app/campaigns/[id]/dm/units/__tests__/page-client.test.tsx` (new)

**Recipe:**
- Empty list markup (e.g. `<p className="text-muted-foreground">Немає юнітів</p>` or an ad-hoc dashed card) → `<EmptyState icon={…} title="Ще немає юнітів" description="…" action={…existing create button…} />`.
- `if (isLoading) return <p>Завантаження...</p>` / inline loading text → `<LoadingState rows={6} label="Завантаження юнітів…" />`.
- Lists driven by a query hook → `<QueryState query={unitsQuery} empty={<EmptyState …/>}>{(units) => …}</QueryState>` when the page already holds the query result; pages that receive `initial*` props from the server keep that data path and only use `EmptyState`.
- `loading.tsx` bodies → `<LoadingState rows={…} />` inside the existing container.
- Icons: battles `Swords`, characters `Users`, main skills `Network`, races `Dna`, skills `Sparkles`, spells `Wand2`, units `Skull`, artifacts `Gem`, sets `Layers`, campaigns `Map`.

- [ ] **Step 1: Failing test** — `app/campaigns/[id]/dm/units/__tests__/page-client.test.tsx`

```tsx
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DMUnitsPageClient } from "@/app/campaigns/[id]/dm/units/page-client";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("DM units list", () => {
  afterEach(cleanup);

  it("порожній список — EmptyState із заголовком", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmProvider>
          <DMUnitsPageClient campaignId="c1" initialUnits={[]} />
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Ще немає юнітів")).toBeInTheDocument();
  });
});
```

Run: `pnpm test:run 'app/campaigns/[id]/dm/units'` — Expected: FAIL. (If the page client needs more providers/mocks to render, add them to this test and ledger it.)

- [ ] **Step 2: Migrate** every listed file with the recipe.

- [ ] **Step 3: PASS, commit**

```bash
pnpm test:run && pnpm exec eslint --fix app components && pnpm exec tsc --noEmit -p . && git add -A && git commit -m "refactor(ui): list pages and route loaders use page states"
```

---

### Task 9: Form footers onto `ActionBar`

**Files (Modify):** `components/skills/form/SkillCreateForm.tsx`, `components/artifacts/ArtifactForm.tsx`, `components/artifact-sets/ArtifactSetForm.tsx`, `app/campaigns/[id]/dm/units/[unitId]/page.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/DmCharacterEditForm.tsx`, `app/campaigns/new/page.tsx`, `app/campaigns/[id]/dm/battles/new/page.tsx`
- Test: extend `components/artifacts/__tests__/ArtifactForm.test.tsx`

**Recipe:** the form's trailing button row (`<div className="flex gap-2">` / `flex flex-wrap gap-2` with submit + cancel [+ delete]) → `<ActionBar>` with order: destructive/secondary first, cancel, submit last. A destructive delete keeps `variant="destructive"`; drop `ml-auto`.

- [ ] **Step 1: Failing test** — append to `components/artifacts/__tests__/ArtifactForm.test.tsx`:

```tsx
  it("кнопки форми — у панелі дій, «Створити» остання", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ArtifactForm campaignId="c1" artifactSets={[]} mode="create" title="Новий" submitLabel="Створити" submitLabelSaving="..." cancelHref="/x" iconHint="" initial={{ name: "Меч", description: "", rarity: "", slot: "ring", icon: "", setId: "", abilities: [], abilityIssues: [] }} onSubmit={vi.fn(async () => {})} />
      </QueryClientProvider>,
    );

    const bar = document.querySelector("[data-slot=action-bar]") as HTMLElement;

    expect(bar).not.toBeNull();
    expect(bar.lastElementChild).toHaveTextContent("Створити");
  });
```

Run: `pnpm test:run components/artifacts` — Expected: FAIL.

- [ ] **Step 2: Migrate** every listed form.

- [ ] **Step 3: PASS, commit**

```bash
pnpm test:run && pnpm exec eslint --fix app components && pnpm exec tsc --noEmit -p . && git add -A && git commit -m "refactor(ui): form footers use ActionBar"
```

---

### Task 10: Guards, docs, full verification, mobile browser check

**Files:**
- Modify: `eslint.config.mjs`, `ARCHITECTURE.md`, `CLAUDE.md`
- Test: `components/ui/__tests__/eslint-guards.test.ts`

- [ ] **Step 1: Failing test** — `components/ui/__tests__/eslint-guards.test.ts`

```ts
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const lint = async (code: string, filePath: string) => {
  const [r] = await new ESLint({ cwd: process.cwd() }).lintText(code, { filePath });

  return r.messages.map((m) => m.ruleId);
};

describe("ESLint guards", () => {
  it("raw dialog / alert-dialog / vaul are forbidden outside components/ui", async () => {
    expect(await lint('import { Dialog } from "@/components/ui/dialog";\nexport const x = Dialog;\n', "components/foo/Bar.tsx")).toContain("no-restricted-imports");
    expect(await lint('import { Drawer } from "vaul";\nexport const x = Drawer;\n', "app/foo/page.tsx")).toContain("no-restricted-imports");
  });

  it("allowed inside components/ui", async () => {
    expect(await lint('import { Drawer } from "vaul";\nexport const x = Drawer;\n', "components/ui/thing.tsx")).not.toContain("no-restricted-imports");
  });

  it("native confirm/alert are forbidden", async () => {
    expect(await lint("export const f = () => confirm(\"x\");\n", "components/foo/Bar.tsx")).toContain("no-restricted-globals");
  });
});
```

Run: `pnpm test:run components/ui/__tests__/eslint-guards.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement** — append to `eslint.config.mjs` before the closing `]);`:

```js
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/components/ui/dialog", message: "Використайте ResponsiveDialog з @/components/ui/responsive-dialog" },
            { name: "@/components/ui/alert-dialog", message: "Використайте useConfirm з @/lib/hooks/common" },
            { name: "vaul", message: "Використайте ResponsiveDialog з @/components/ui/responsive-dialog" },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "confirm", message: "Використайте useConfirm з @/lib/hooks/common" },
        { name: "alert", message: "Використайте useConfirm або ErrorState" },
      ],
    },
  },
```

(If `components/ui/__tests__/**` or `app/**/__tests__/**` legitimately import the raw dialog, add them to `ignores`.)

- [ ] **Step 3: Docs**
- `ARCHITECTURE.md` §2.1 `ui/` row: add «`ResponsiveDialog` (модалка на десктопі, шторка `vaul` на телефоні), `ConfirmProvider`»; `common/` row: add «`ActionBar`, `states/` (`EmptyState`, `LoadingState`, `ErrorState`, `QueryState`)».
- `CLAUDE.md` → "Component API conventions": add bullets:
  - "Dialogs: `ResponsiveDialog` (`components/ui/responsive-dialog`) — never Radix `Dialog`/`AlertDialog` or `vaul` directly (ESLint enforces). Confirmations: `useConfirm()` from `@/lib/hooks/common`, never `window.confirm`."
  - "List/page states: `components/common/states` (`QueryState`, `EmptyState`, `LoadingState`, `ErrorState`); form buttons: `ActionBar`."
  - "Layering: components never import `@/lib/api/*`; requests live in `lib/api`, loading/mutations/complex logic in hooks (`lib/hooks/<domain>`), components call a hook and render."

- [ ] **Step 4: Full verification**

Run: `pnpm test:run && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm build && pnpm simulate-battle`
Expected: all green; simulate-battle `Перевірок: 34, провалено: 0`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore(ui): ESLint guards for dialogs/confirm; docs"
```

- [ ] **Step 6: Mobile check in the browser (user request)**
- Start `pnpm dev` (background) against the local Docker DB (`pnpm db:local` if not running).
- Open `http://localhost:3000` in Chrome via the browser tools, resize the window to 390×844 (phone). If not logged in, ask the user to log in in that tab.
- Walk through: the DM units list (EmptyState / list), open «Створити расу» (sheet with sticky footer; open «+ Вміння» → nested sheet; swipe/close), delete a unit (confirm sheet), an artifact form (sticky ActionBar), the seeded simulation battle from `pnpm simulate-battle` (battle dialogs as sheets above the DM panel).
- Record a GIF (`ui-primitives-mobile.gif`) and report what was seen, including anything that looked wrong.
