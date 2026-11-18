export interface ContextExtHolder {
    ext: Record<string, unknown>;
}

export interface ContextExt<T> {
    read(ctx: Partial<ContextExtHolder> | undefined): T | undefined;
    write(ctx: ContextExtHolder, value: T): void;
}

export const defineContextExt = <T>(module: string): ContextExt<T> => ({
    read: (ctx) => ctx?.ext?.[module] as T | undefined,
    write: (ctx, value) => {
        ctx.ext = { ...ctx.ext, [module]: value };
    },
});
