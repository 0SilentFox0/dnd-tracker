"use client";

import { useMemo } from "react";
import { type AbstractIntlMessages, NextIntlClientProvider, useLocale, useMessages, useTimeZone } from "next-intl";

export function ExtendMessages({ messages, children }: { messages: AbstractIntlMessages; children: React.ReactNode }) {
  const outer = useMessages();

  const locale = useLocale();

  const timeZone = useTimeZone();

  const merged = useMemo(() => ({ ...outer, ...messages }), [outer, messages]);

  return (
    <NextIntlClientProvider locale={locale} messages={merged} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
