import { createAdminClient } from '@/lib/supabase/admin';

export async function copyStorageObject(
    bucket: string,
    fromPath: string,
    toPath: string
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
    try {
        const storage = createAdminClient().storage.from(bucket);

        const { error } = await storage.copy(fromPath, toPath);

        return error
            ? { ok: false, message: error.message }
            : { ok: true, url: storage.getPublicUrl(toPath).data.publicUrl };
    } catch (e) {
        return {
            ok: false,
            message: e instanceof Error ? e.message : 'copy failed',
        };
    }
}
