import { DEFAULT_TEMPLATE_LOCALE } from "@/lib/constants/campaigns";

export const templateLocaleWhere = (locale: string = DEFAULT_TEMPLATE_LOCALE) => (locale === DEFAULT_TEMPLATE_LOCALE ? { OR: [{ locale: null }, { locale }] } : { locale });
