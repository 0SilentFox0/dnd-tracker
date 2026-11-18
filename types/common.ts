export interface IdName {
    id: string;
    name: string;
}

export type Result<T> =
    | { ok: true; value: T }
    | { ok: false; message: string; params?: Record<string, string | number> };
