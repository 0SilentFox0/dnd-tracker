import type { AbstractIntlMessages } from "next-intl";

import type { Namespace } from "./config";
import { ExtendMessages } from "./extend-messages";
import { loadMessages } from "./messages";
import { getRequestLocale } from "./request-locale";

export async function ExtendLocaleScope({ namespaces, children }: { namespaces: readonly Namespace[]; children: React.ReactNode }) {
  const messages = await loadMessages(await getRequestLocale(), namespaces);

  return <ExtendMessages messages={messages as AbstractIntlMessages}>{children}</ExtendMessages>;
}
