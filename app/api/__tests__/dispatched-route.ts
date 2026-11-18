import { moduleContentRoute } from '@/lib/server/content/module-dispatch';

type Ctx = { params: Promise<Record<string, string>> };

const METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;

/** Route-module-shaped handlers that go through the module dispatcher; `:name` segments come from ctx.params */
export const dispatchedRoute = (template: string) =>
    Object.fromEntries(
        METHODS.map((method) => [
            method,
            async (req: Request, ctx: Ctx) => {
                const params = await ctx.params;

                const [kind, ...rest] = template
                    .split('/')
                    .map((s) => (s.startsWith(':') ? params[s.slice(1)] : s));

                return moduleContentRoute(method)(req, {
                    params: Promise.resolve({ id: params.id, kind, rest }),
                });
            },
        ])
    ) as Record<(typeof METHODS)[number], (req: Request, ctx: Ctx) => Promise<Response>>;
