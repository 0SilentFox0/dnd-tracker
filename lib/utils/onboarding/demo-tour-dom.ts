import type { DemoTourStep } from '@/lib/onboarding/demo-tours';

const TOOLTIP_ROOM_PX = 220;

const BEFORE_TIMEOUT_MS = 20000;

export const SCROLL_OFFSET_PX = 120;

const OPTIONAL_WAIT_MS = 2000;

const CLICK_SOURCE_WAIT_MS = 4000;

const CLICK_UNTIL_ATTEMPTS = 15;

const CLICK_UNTIL_STEP_MS = 2500;

const CLICK_UNTIL_TIMEOUT_MS = 30000;

const POLL_MS = 100;

const SETTLE_ATTEMPTS = 8;

export const stepWait = (item: {
    optional?: boolean;
    clickUntilTarget?: boolean;
}) =>
    item.optional
        ? OPTIONAL_WAIT_MS + 1000
        : item.clickUntilTarget
          ? CLICK_UNTIL_TIMEOUT_MS
          : BEFORE_TIMEOUT_MS;

async function waitFor<T>(
    probe: () => T | null,
    deadline: number
): Promise<T | null> {
    for (;;) {
        const found = probe();

        if (found || Date.now() >= deadline) return found;

        await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
    }
}

const rectKey = (box: DOMRect) =>
    [box.top, box.left, box.width, box.height].map(Math.round).join(':');

async function settle(target: Element) {
    let previous = rectKey(target.getBoundingClientRect());

    for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));

        const current = rectKey(target.getBoundingClientRect());

        if (current === previous) return;

        previous = current;
    }
}

function headerOffset() {
    const header = document.querySelector('body header');

    if (
        header &&
        ['sticky', 'fixed'].includes(getComputedStyle(header).position)
    )
        return header.getBoundingClientRect().bottom;

    return (
        parseFloat(
            getComputedStyle(document.body).getPropertyValue('--app-header-h')
        ) || 0
    );
}

async function revealTarget(target: Element) {
    await settle(target);

    const box = target.getBoundingClientRect();

    const top = headerOffset();

    const tall = box.height > window.innerHeight - TOOLTIP_ROOM_PX;

    const visible =
        box.top >= top &&
        (tall
            ? box.top < window.innerHeight / 2
            : box.bottom <= window.innerHeight - TOOLTIP_ROOM_PX / 2);

    if (visible || !(target instanceof HTMLElement)) return;

    const previousMargin = target.style.scrollMarginTop;

    target.style.scrollMarginTop = `${top + 16}px`;
    target.scrollIntoView({
        block: tall ? 'start' : 'center',
        behavior: 'instant',
    });
    target.style.scrollMarginTop = previousMargin;

    await new Promise((resolve) =>
        window.requestAnimationFrame(() => resolve(undefined))
    );
}

function activate(element: HTMLElement) {
    const box = element.getBoundingClientRect();

    const init = {
        bubbles: true,
        cancelable: true,
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2,
        pointerId: -1,
        pointerType: 'mouse',
        isPrimary: true,
    };

    if (typeof PointerEvent === 'function') {
        element.dispatchEvent(new PointerEvent('pointerdown', init));
        element.dispatchEvent(new PointerEvent('pointerup', init));
    }

    element.click();
}

export async function prepareTourStep(
    item: DemoTourStep,
    env: {
        campaignPath: string;
        push: (destination: string) => void;
        onTall: (stepId: string) => void;
    }
) {
    const { campaignPath, push, onTall } = env;

    let destination =
        item.route !== undefined
            ? `${campaignPath}${item.route}`
            : window.location.pathname;

    if (item.routeFromTarget) {
        const source = await waitFor(
            () =>
                document.querySelector(`[data-tour="${item.routeFromTarget}"]`),
            Date.now() + BEFORE_TIMEOUT_MS - 700
        );

        const anchor =
            source instanceof HTMLAnchorElement ? source : source?.closest('a');

        if (!(anchor instanceof HTMLAnchorElement)) return;

        destination = new URL(anchor.href).pathname;
    }

    if (!window.location.pathname.endsWith(destination)) push(destination);

    const deadline = Date.now() + stepWait(item) - 700;

    const arrived = () => window.location.pathname.endsWith(destination);

    const find = () => (arrived() ? document.querySelector(item.target) : null);

    if (item.clickFromTarget) {
        const sourceSelector = `[data-tour="${item.clickFromTarget}"]`;

        const source = await waitFor(
            () => (arrived() ? document.querySelector(sourceSelector) : null),
            Math.min(deadline, Date.now() + CLICK_SOURCE_WAIT_MS)
        );

        if (source instanceof HTMLElement) {
            activate(source);

            if (item.clickUntilTarget) {
                const enabledSource = () => {
                    const again = document.querySelector(sourceSelector);

                    return again instanceof HTMLElement &&
                        !(again as HTMLButtonElement).disabled
                        ? again
                        : null;
                };

                for (
                    let attempt = 0;
                    attempt < CLICK_UNTIL_ATTEMPTS && Date.now() < deadline;
                    attempt += 1
                ) {
                    const ready = await waitFor(
                        () => find() ?? enabledSource(),
                        Math.min(deadline, Date.now() + CLICK_UNTIL_STEP_MS)
                    );

                    if (find()) break;

                    if (ready instanceof HTMLElement) activate(ready);
                }
            }
        }
    }

    const target = await waitFor(find, deadline);

    if (!target) return;

    await revealTarget(target);

    if (
        target.getBoundingClientRect().height >
        window.innerHeight - TOOLTIP_ROOM_PX
    )
        onTall(item.id);
}
