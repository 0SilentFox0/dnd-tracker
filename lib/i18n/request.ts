import { getRequestConfig } from "next-intl/server";

import { loadMessages } from "./messages";
import { getRequestLocale } from "./request-locale";
import { getRequestTimeZone } from "./request-time-zone";

export default getRequestConfig(async () => {
  const [locale, timeZone] = await Promise.all([getRequestLocale(), getRequestTimeZone()]);

  return {
    locale,
    timeZone,
    messages: await loadMessages(locale, ["common", "validation"]),
    getMessageFallback: ({ namespace, key }) => (namespace ? `${namespace}.${key}` : key),
    onError: (error) => {
      if (process.env.NODE_ENV !== "production") console.warn(error.message);
    },
  };
});
