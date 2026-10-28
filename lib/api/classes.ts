import { createCampaignCrudApi } from "@/lib/api/client";
import type { ClassFormData, GameClassData } from "@/types/classes";

const classesApi = createCampaignCrudApi<GameClassData, ClassFormData, Partial<ClassFormData>, { ok: true }>("/classes");

export const getClasses = classesApi.list;
export const getClass = classesApi.get;
export const createClass = classesApi.create;
export const updateClass = classesApi.update;
export const deleteClass = classesApi.remove;
