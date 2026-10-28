import { LocaleScope } from "@/lib/i18n/locale-scope";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LocaleScope namespaces={["common", "validation"]}>{children}</LocaleScope>;
}
