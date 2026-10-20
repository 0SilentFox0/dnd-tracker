"use client";

import { useEffect, useEffectEvent } from "react";

type PusherModule = typeof import("@/lib/pusher/client");

type PusherClient = NonNullable<ReturnType<PusherModule["getPusherClient"]>>;

let pusherModule: Promise<PusherModule> | null = null;

// one shared import: concurrent dynamic imports of the same module may resolve to different instances under vitest mocks
const loadPusher = () => (pusherModule ??= import("@/lib/pusher/client"));

export type PusherHandlers = Record<string, (data: unknown) => void>;

interface ChannelCallbacks {
  onSubscribed?: () => void;
  onError?: (error: unknown) => void;
}

/** Лінивий pusher-js: setup отримує клієнт, коли модуль завантажено; повертає cleanup для useEffect. */
function withPusher(setup: (pusher: PusherClient) => () => void): () => void {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_PUSHER_KEY) return () => {};

  let mounted = true;

  let teardown: (() => void) | null = null;

  void loadPusher().then(({ getPusherClient }) => {
    if (!mounted) return;

    const pusher = getPusherClient();

    if (pusher) teardown = setup(pusher);
  });

  return () => {
    mounted = false;
    teardown?.();
  };
}

/** Підписка на канал; перепідписується лише при зміні назви каналу чи набору подій. */
export function usePusherChannel(name: string | null, handlers: PusherHandlers, callbacks: ChannelCallbacks = {}) {
  const events = Object.keys(handlers).join("\n");

  const dispatch = useEffectEvent((event: string, data: unknown) => handlers[event]?.(data));

  const subscribed = useEffectEvent(() => callbacks.onSubscribed?.());

  const failed = useEffectEvent((error: unknown) => callbacks.onError?.(error));

  useEffect(() => {
    if (!name) return;

    return withPusher((pusher) => {
      const channel = pusher.subscribe(name);

      const bindings: [string, (data: unknown) => void][] = [
        ...events.split("\n").filter(Boolean).map((event): [string, (data: unknown) => void] => [event, (data) => dispatch(event, data)]),
        ["pusher:subscription_succeeded", () => subscribed()],
        ["pusher:subscription_error", (error) => failed(error)],
      ];

      for (const [event, fn] of bindings) channel.bind(event, fn);

      return () => {
        for (const [event, fn] of bindings) channel.unbind(event, fn);
        pusher.unsubscribe(name);
      };
    });
  }, [name, events]);
}

/** Стан з'єднання Pusher; onReconnect — після будь-якого виходу з connected і повернення. */
export function usePusherConnection(onState: (state: string) => void, onReconnect: () => void) {
  const report = useEffectEvent(onState);

  const reconnected = useEffectEvent(onReconnect);

  useEffect(
    () =>
      withPusher((pusher) => {
        let wasDisconnected = false;

        const onChange = (states: { previous: string; current: string }) => {
          report(states.current);

          if (states.previous === "connected" && states.current !== "connected") wasDisconnected = true;

          if (states.current === "connected" && wasDisconnected) {
            wasDisconnected = false;
            reconnected();
          }
        };

        pusher.connection.bind("state_change", onChange);
        report(pusher.connection.state);

        return () => pusher.connection.unbind("state_change", onChange);
      }),
    [],
  );
}
