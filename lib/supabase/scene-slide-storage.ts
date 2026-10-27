import { MAX_SLIDE_BYTES, SCENE_SLIDES_BUCKET, SLIDE_BUCKET_TYPES, SLIDE_FORMATS, type SlideUploadType } from "@/lib/constants/show";
import { imageBucketStorage } from "@/lib/supabase/image-bucket-storage";

const slides = imageBucketStorage<SlideUploadType | keyof typeof SLIDE_FORMATS>({ bucket: SCENE_SLIDES_BUCKET, maxBytes: MAX_SLIDE_BYTES, formats: SLIDE_FORMATS, bucketTypes: SLIDE_BUCKET_TYPES, logTag: "scene-slides" });

export const ensureSlidesBucket = slides.ensure;
export const createSlideUploadTicket = (campaignId: string, contentType: SlideUploadType) => slides.createTicket(campaignId, contentType);
export const ownedSlidePath = slides.ownedPath;
export const removeSlideFiles = slides.remove;
