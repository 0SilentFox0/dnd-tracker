import { request } from './client';

import type { AdminOverview, AdminRange } from '@/types/admin';

export const getAdminOverview = (range: AdminRange) =>
    request<AdminOverview>(`/api/admin/overview?range=${range}`);
