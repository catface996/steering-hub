/**
 * Unified API request layer built on native fetch.
 */

import { message as antdMessage } from 'antd';

export interface ApiResponse<T = unknown> {
  code: number | string;
  message: string;
  data: T;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  skipErrorToast?: boolean;
}

export class RequestError extends Error {
  code: string | number;
  requestId?: string;

  constructor(message: string, code: string | number, requestId?: string) {
    super(message);
    this.name = 'RequestError';
    this.code = code;
    this.requestId = requestId;
  }
}

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';
const TOKEN_KEY = 'steering_hub_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('steering_hub_user');
}

async function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    body,
    skipAuth = false,
    skipErrorToast = false,
    headers: customHeaders,
    ...restInit
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = { ...restInit, headers };
  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, config);
  } catch (err) {
    const errorMsg = '网络异常，请检查连接';
    if (!skipErrorToast) antdMessage.error(errorMsg);
    throw new RequestError(errorMsg, 'NETWORK_ERROR');
  }

  const requestId = response.headers.get('X-Request-Id') ?? undefined;

  if (!response.ok) {
    let errorBody: Record<string, unknown> | undefined;
    try {
      errorBody = (await response.json()) as Record<string, unknown>;
    } catch {
      // non-JSON body
    }

    const errorCode =
      errorBody?.errorCode ?? errorBody?.code ?? response.status;

    if (response.status === 401) {
      clearToken();
      window.location.href = '/login';
      throw new RequestError(
        (errorBody?.message as string) ?? 'Authentication required',
        errorCode as string | number,
        requestId,
      );
    }

    const errorMsg = (errorBody?.message as string) ?? `HTTP ${response.status}`;
    if (!skipErrorToast) antdMessage.error(errorMsg);
    throw new RequestError(errorMsg, errorCode as string | number, requestId);
  }

  const data: ApiResponse<T> = await response.json();

  const isSuccess = data.code === 200 || data.code === 'SUCCESS' || data.code === 0;
  if (!isSuccess) {
    if (String(data.code).startsWith('401')) {
      clearToken();
      window.location.href = '/login';
      throw new RequestError(data.message, data.code, requestId);
    }

    if (!skipErrorToast) antdMessage.error(data.message);
    throw new RequestError(data.message, data.code, requestId);
  }

  return data;
}

function get<T = unknown>(url: string, options?: RequestOptions) {
  return request<T>(url, { ...options, method: 'GET' });
}

function post<T = unknown>(url: string, body?: unknown, options?: RequestOptions) {
  return request<T>(url, { ...options, method: 'POST', body });
}

function put<T = unknown>(url: string, body?: unknown, options?: RequestOptions) {
  return request<T>(url, { ...options, method: 'PUT', body });
}

function patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions) {
  return request<T>(url, { ...options, method: 'PATCH', body });
}

function del<T = unknown>(url: string, options?: RequestOptions) {
  return request<T>(url, { ...options, method: 'DELETE' });
}

export default request;
export { get, post, put, patch, del };
