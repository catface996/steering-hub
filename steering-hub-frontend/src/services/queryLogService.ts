import { get } from '../utils/request';
import type { QueryLog, PageResult } from '../types';

export interface QueryLogParams {
  query?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export const queryLogService = {
  list: (params: QueryLogParams = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.set(k, String(v));
    });
    return get<PageResult<QueryLog>>(`/api/v1/web/search/logs?${query}`).then((r) => r.data);
  },
};
