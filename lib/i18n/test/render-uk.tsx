import type { ComponentType, ReactElement, ReactNode } from "react";
import { render as rtlRender, type RenderOptions } from "@testing-library/react";

import { IntlWrapper } from "./intl-wrapper";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";

/** `render` with the real uk catalog; the test file must `vi.unmock("next-intl")`. */
export function render(ui: ReactElement, options: Omit<RenderOptions, "queries"> = {}) {
  const Inner = options.wrapper as ComponentType<{ children: ReactNode }> | undefined;

  const Wrapper = ({ children }: { children: ReactNode }) => <IntlWrapper>{Inner ? <Inner>{children}</Inner> : children}</IntlWrapper>;

  return rtlRender(ui, { ...options, wrapper: Wrapper });
}

export const renderWithConfirm = (ui: ReactElement) => render(<ConfirmProvider>{ui}</ConfirmProvider>);
