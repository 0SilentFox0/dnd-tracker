import { createAdminClient } from '@/lib/supabase/admin';

export async function copyStorageObject(
    bucket: string,
    fromPath: string,
    toPath: string
): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
        const { error } = await createAdminClient()
            .storage.from(bucket)
            .copy(fromPath, toPath);

        return error ? { ok: false, message: error.message } : { ok: true };
    } catch (e) {
        return {
            ok: false,
            message: e instanceof Error ? e.message : 'copy failed',
        };
    }
}
