import { getRequestConfig } from "next-intl/server";

import { APP_TIME_ZONE } from "./config";
import { loadMessages } from "./messages";
import { getRequestLocale } from "./request-locale";

export default getRequestConfig(async () => {
  const locale = await getRequestLocale();

  return {
    locale,
    timeZone: APP_TIME_ZONE,
    messages: await loadMessages(locale, ["common", "validation"]),
    getMessageFallback: ({ namespace, key }) => (namespace ? `${namespace}.${key}` : key),
    onError: (error) => {
      if (process.env.NODE_ENV !== "production") console.warn(error.message);
    },
  };
});
