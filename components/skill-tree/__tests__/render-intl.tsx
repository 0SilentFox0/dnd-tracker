import type { ReactElement } from "react";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import type { Locale } from "@/lib/i18n/config";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

export const renderSkillTree = (ui: ReactElement, locale: Locale = "uk") =>
  renderWithIntl(<ConfirmProvider>{ui}</ConfirmProvider>, { locale, namespaces: ["common", "skillTree", "abilityRegistry"] });
