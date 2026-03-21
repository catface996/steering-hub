import { post, type ApiResponse } from './request';

const TOKEN_KEY = 'steering_hub_token';
const USER_KEY = 'steering_hub_user';

export interface AuthUser {
  username: string;
  nickname: string;
  role: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

interface LoginResponseData {
  token: string;
  username: string;
  nickname: string;
  role: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  return token !== null && token.length > 0;
}

export async function login(params: LoginParams): Promise<AuthUser> {
  const res: ApiResponse<LoginResponseData> = await post<LoginResponseData>(
    '/api/v1/web/auth/login',
    params,
    { skipAuth: true },
  );

  const { token, username, nickname, role } = res.data;

  setToken(token);
  const user: AuthUser = { username, nickname, role };
  setUser(user);

  return user;
}

export async function logout(): Promise<void> {
  try {
    await post('/api/v1/web/auth/logout');
  } catch {
    // Ignore
  } finally {
    clearToken();
    clearUser();
  }
}

export function clearAuth(): void {
  clearToken();
  clearUser();
}
