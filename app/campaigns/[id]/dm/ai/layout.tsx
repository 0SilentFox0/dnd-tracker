import { ExtendLocaleScope } from "@/lib/i18n/extend-locale-scope";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ExtendLocaleScope namespaces={["ai"]}>{children}</ExtendLocaleScope>;
}
