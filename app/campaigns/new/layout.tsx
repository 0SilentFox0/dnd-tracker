import { RouteScope } from '@/lib/i18n/route-scope';

export default function Layout({ children }: { children: React.ReactNode }) {
    return <RouteScope route="new">{children}</RouteScope>;
}
