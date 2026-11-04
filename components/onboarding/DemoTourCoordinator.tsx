"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Step } from "react-joyride";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import type { DemoTourRunnerProps } from "@/components/onboarding/DemoTourRunner";
import { DemoTourTooltip } from "@/components/onboarding/DemoTourTooltip";
import { useSetOnboardingFlag } from "@/lib/hooks/onboarding";
import { useTranslator } from "@/lib/i18n/use-translator";
import { setActiveDemoTour } from "@/lib/onboarding/active-demo-tour";
import { DEMO_TOURS } from "@/lib/onboarding/demo-tours";
import { demoTourFlagKey, type DemoTourId } from "@/lib/onboarding/flag-keys";

const DemoTourRunner = dynamic<DemoTourRunnerProps>(() => import("@/components/onboarding/DemoTourRunner").then((module) => module.DemoTourRunner), { ssr: false });

const JOYRIDE = { FINISHED: "finished", TOOLTIP: "tooltip", TOUR_END: "tour:end" } as const;

// запас під тултіп: якщо ціль + тултіп не вміщаються у вікно, крок центруємо
const TOOLTIP_ROOM_PX = 220;

// перше відкриття бібліотек і боїв (холодний сервер, запуск бою) буває довшим за 5 с
const BEFORE_TIMEOUT_MS = 20000;

// joyride скролить ціль до верху вікна: без запасу вона ховається під липкою шапкою (89px)
const SCROLL_OFFSET_PX = 120;

const CLICK_SOURCE_WAIT_MS = 4000;

const CLICK_UNTIL_ATTEMPTS = 15;

const CLICK_UNTIL_STEP_MS = 2500;

const CLICK_UNTIL_TIMEOUT_MS = 30000;

const POLL_MS = 100;

const SETTLE_ATTEMPTS = 8;

async function waitFor<T>(probe: () => T | null, deadline: number): Promise<T | null> {
  for (;;) {
    const found = probe();

    if (found || Date.now() >= deadline) return found;

    await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
  }
}

const rectKey = (box: DOMRect) => [box.top, box.left, box.width, box.height].map(Math.round).join(":");

// шухляди й панелі в'їжджають анімацією: спотлайт міряємо, коли ціль перестала рухатися
async function settle(target: Element) {
  let previous = rectKey(target.getBoundingClientRect());

  for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));

    const current = rectKey(target.getBoundingClientRect());

    if (current === previous) return;

    previous = current;
  }
}

// липка шапка: ціль під нею видно не буде
function headerOffset() {
  const header = document.querySelector("body header");

  if (header && ["sticky", "fixed"].includes(getComputedStyle(header).position)) return header.getBoundingClientRect().bottom;

  return parseFloat(getComputedStyle(document.body).getPropertyValue("--app-header-h")) || 0;
}

async function revealTarget(target: Element) {
  await settle(target);

  const box = target.getBoundingClientRect();

  const top = headerOffset();

  const tall = box.height > window.innerHeight - TOOLTIP_ROOM_PX;

  const visible = box.top >= top && (tall ? box.top < window.innerHeight / 2 : box.bottom <= window.innerHeight - TOOLTIP_ROOM_PX / 2);

  if (visible || !(target instanceof HTMLElement)) return;

  // scroll-margin працює і у вкладених overflow-контейнерах, на відміну від scrollBy
  const previousMargin = target.style.scrollMarginTop;

  target.style.scrollMarginTop = `${top + 16}px`;
  target.scrollIntoView({ block: tall ? "start" : "center", behavior: "instant" });
  target.style.scrollMarginTop = previousMargin;

  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
}

// маркери карти слухають pointerup, кнопки — click: шлемо обидва
function activate(element: HTMLElement) {
  const box = element.getBoundingClientRect();

  const init = { bubbles: true, cancelable: true, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, pointerId: -1, pointerType: "mouse", isPrimary: true };

  if (typeof PointerEvent === "function") {
    element.dispatchEvent(new PointerEvent("pointerdown", init));
    element.dispatchEvent(new PointerEvent("pointerup", init));
  }

  element.click();
}

// темний UI: 50% дефолтного оверлею не виділяє ціль, тому затемнення сильніше + золота рамка вирізу
const TOUR_STYLES: DemoTourRunnerProps["styles"] = { overlay: { backgroundColor: "rgba(0, 0, 0, 0.78)" }, spotlight: { stroke: "var(--color-hud-gold-strong)", strokeWidth: 2 } };

type DemoTourContextValue = { startTour(id: DemoTourId): void; activeTour: DemoTourId | null };

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

export function useDemoTour() {
  const context = useContext(DemoTourContext);

  if (!context) throw new Error("useDemoTour must be used inside DemoTourCoordinator");

  return context;
}

export function DemoTourCoordinator({ campaignId, children }: { campaignId: string; children: ReactNode }) {
  const t = useTranslator("demoTours");

  const router = useRouter();

  const setFlag = useSetOnboardingFlag();

  const [activeTour, setActiveTour] = useState<DemoTourId | null>(null);

  const [run, setRun] = useState(false);

  useEffect(() => {
    setActiveDemoTour(run ? activeTour : null);

    return () => setActiveDemoTour(null);
  }, [run, activeTour]);

  const lastStepShown = useRef(false);

  // цілі на весь екран (сцена бою, довгі списки): прив'язаний тултіп вилітає за вікно — такі кроки центруємо
  const [centeredSteps, setCenteredSteps] = useState<ReadonlySet<string>>(() => new Set());

  const campaignPath = `/campaigns/${campaignId}`;

  const startTour = useCallback((id: DemoTourId) => {
    if (!DEMO_TOURS.some((item) => item.id === id)) return;

    lastStepShown.current = false;
    setCenteredSteps(new Set());
    setActiveTour(id);
    setRun(true);
  }, []);

  const tour = activeTour ? DEMO_TOURS.find((item) => item.id === activeTour) : null;

  const steps = useMemo<Step[]>(() => tour?.steps.map((item) => ({
    id: `${tour.id}.${item.id}`,
    target: item.target,
    title: t(item.titleKey),
    content: t(item.descriptionKey),
    placement: centeredSteps.has(item.id) ? "center" : item.placement ?? "bottom",
    beforeTimeout: item.clickUntilTarget ? CLICK_UNTIL_TIMEOUT_MS : BEFORE_TIMEOUT_MS,
    before: async () => {
      let destination = item.route !== undefined ? `${campaignPath}${item.route}` : window.location.pathname;

      if (item.routeFromTarget) {
        const source = await waitFor(() => document.querySelector(`[data-tour="${item.routeFromTarget}"]`), Date.now() + BEFORE_TIMEOUT_MS - 700);

        const anchor = source instanceof HTMLAnchorElement ? source : source?.closest("a");

        if (!(anchor instanceof HTMLAnchorElement)) return;

        destination = new URL(anchor.href).pathname;
      }

      if (!window.location.pathname.endsWith(destination)) router.push(destination);

      const deadline = Date.now() + (item.clickUntilTarget ? CLICK_UNTIL_TIMEOUT_MS : BEFORE_TIMEOUT_MS) - 700;

      const arrived = () => window.location.pathname.endsWith(destination);

      const find = () => (arrived() ? document.querySelector(item.target) : null);

      if (item.clickFromTarget) {
        const sourceSelector = `[data-tour="${item.clickFromTarget}"]`;

        const source = await waitFor(() => (arrived() ? document.querySelector(sourceSelector) : null), Math.min(deadline, Date.now() + CLICK_SOURCE_WAIT_MS));

        // відсутнє джерело (напр. плеєр уже розгорнуто) — просто йдемо до цілі
        if (source instanceof HTMLElement) {
          activate(source);

          if (item.clickUntilTarget) {
            // кожен клік — запит на сервер: наступний лише коли кнопка знову активна або ціль з'явилась
            const enabledSource = () => {
              const again = document.querySelector(sourceSelector);

              return again instanceof HTMLElement && !(again as HTMLButtonElement).disabled ? again : null;
            };

            for (let attempt = 0; attempt < CLICK_UNTIL_ATTEMPTS && Date.now() < deadline; attempt += 1) {
              const ready = await waitFor(() => find() ?? enabledSource(), Math.min(deadline, Date.now() + CLICK_UNTIL_STEP_MS));

              if (find()) break;

              if (ready instanceof HTMLElement) activate(ready);
            }
          }
        }
      }

      const target = await waitFor(find, deadline);

      if (!target) return;

      // joyride скролить лише вікно, а сторінки скролять усередині overflow-контейнерів
      await revealTarget(target);

      if (target.getBoundingClientRect().height > window.innerHeight - TOOLTIP_ROOM_PX) setCenteredSteps((prev) => (prev.has(item.id) ? prev : new Set(prev).add(item.id)));
    },
  })) ?? [], [campaignPath, centeredSteps, router, t, tour]);

  const onEvent = useCallback((event: { action: string; type: string; index: number; status: string; step: { id?: string } }) => {
    if (activeTour && event.step.id && !event.step.id.startsWith(`${activeTour}.`)) return;

    if (event.type === JOYRIDE.TOOLTIP && event.index === steps.length - 1) lastStepShown.current = true;

    if (event.type === JOYRIDE.TOUR_END) {
      if (event.status === JOYRIDE.FINISHED && lastStepShown.current && activeTour) {
        setFlag(demoTourFlagKey(activeTour), "complete");
      }

      lastStepShown.current = false;
      setRun(false);
      setActiveTour(null);
    }
  }, [activeTour, setFlag, steps.length]);

  const contextValue = useMemo(() => ({ startTour, activeTour }), [activeTour, startTour]);

  return (
    <DemoTourContext.Provider value={contextValue}>
      {children}
      {tour && (
        <DemoTourRunner
          run={run}
          steps={steps}
          continuous
          scrollToFirstStep
          onEvent={onEvent}
          tooltipComponent={DemoTourTooltip}
          styles={TOUR_STYLES}
          locale={{ back: t("controls.back"), close: t("controls.close"), last: t("controls.last"), next: t("controls.next"), nextWithProgress: t("controls.next"), skip: t("controls.skip") }}
          options={{ buttons: ["back", "skip", "close", "primary"], closeButtonAction: "skip", dismissKeyAction: false, showProgress: true, skipBeacon: true, spotlightPadding: 8, spotlightRadius: 10, arrowColor: "var(--color-hud-gold-strong)", targetWaitTimeout: 3000, overlayClickAction: false, scrollOffset: SCROLL_OFFSET_PX }}
        />
      )}
    </DemoTourContext.Provider>
  );
}
