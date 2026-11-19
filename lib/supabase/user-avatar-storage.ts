import {
    MAX_USER_AVATAR_BYTES,
    USER_AVATAR_BUCKET_TYPES,
    USER_AVATAR_FORMATS,
    USER_AVATARS_BUCKET,
} from '@/lib/constants/profile';
import { imageBucketStorage } from '@/lib/supabase/image-bucket-storage';

export const userAvatars = imageBucketStorage({
    bucket: USER_AVATARS_BUCKET,
    maxBytes: MAX_USER_AVATAR_BYTES,
    formats: USER_AVATAR_FORMATS,
    bucketTypes: USER_AVATAR_BUCKET_TYPES,
    logTag: 'user-avatars',
});
