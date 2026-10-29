import type { ReactElement, ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { render as rtlRender, type RenderOptions } from "@testing-library/react";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import common from "@/messages/uk/common.json";
import dashboard from "@/messages/uk/dashboard.json";
import scenario from "@/messages/uk/scenario.json";
import validation from "@/messages/uk/validation.json";

const messages = { common, dashboard, scenario, validation };

export const IntlWrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="uk" messages={messages} timeZone="Europe/Kyiv">
    {children}
  </NextIntlClientProvider>
);

export const render = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => rtlRender(ui, { wrapper: IntlWrapper, ...options });

export const renderWithConfirm = (ui: ReactElement) => render(<ConfirmProvider>{ui}</ConfirmProvider>);
