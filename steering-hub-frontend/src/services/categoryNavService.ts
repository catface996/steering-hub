import { get, post, del } from '../utils/request';
import type { CategoryNavItem, SteeringNavItem } from '../types';

export const categoryNavService = {
  listCategories: (parentId?: number) => {
    const params = new URLSearchParams();
    if (parentId != null && parentId > 0) params.set('parentId', String(parentId));
    const qs = params.toString();
    return get<CategoryNavItem[]>(`/api/v1/mcp/categories${qs ? `?${qs}` : ''}`).then((r) => r.data);
  },

  listSteerings: (categoryId: number, limit = 50) =>
    get<SteeringNavItem[]>(`/api/v1/mcp/steerings?categoryId=${categoryId}&limit=${limit}`).then((r) => r.data),

  addHierarchy: (parentCategoryId: number, childCategoryId: number, sortOrder = 0) =>
    post('/api/v1/web/category-hierarchy', { parentCategoryId, childCategoryId, sortOrder }),

  removeHierarchy: (parentCategoryId: number, childCategoryId: number) =>
    post('/api/v1/web/category-hierarchy/remove', { parentCategoryId, childCategoryId }),

  createCategory: (data: { name: string; code?: string; description?: string; parentId?: number }) =>
    post<{ id: number; name: string; parentId?: number }>('/api/v1/web/categories', data).then(r => r.data),
};

export async function deleteCategory(categoryId: number): Promise<void> {
  await del(`/api/v1/web/categories/${categoryId}`);
}
