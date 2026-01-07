import * as SecureStore from 'expo-secure-store';

export interface AuthState {
  accessToken: string;
  refreshToken?: string | null;
  tokenType: string;
  scope?: string | null;
  expiresAt: number;
}

const AUTH_KEY = 'swifty-auth-state';

let cachedState: AuthState | null = null;
let hydrated = false;

export async function loadAuthState(): Promise<AuthState | null> {
  if (hydrated) {
    return cachedState;
  }
  const stored = await SecureStore.getItemAsync(AUTH_KEY);
  hydrated = true;
  if (!stored) {
    cachedState = null;
    return null;
  }
  try {
    cachedState = JSON.parse(stored) as AuthState;
  } catch {
    cachedState = null;
  }
  return cachedState;
}

export async function saveAuthState(state: AuthState): Promise<void> {
  cachedState = state;
  hydrated = true;
  await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(state));
}

export async function clearAuthState(): Promise<void> {
  cachedState = null;
  hydrated = true;
  await SecureStore.deleteItemAsync(AUTH_KEY);
}

export function getCachedAuthState(): AuthState | null {
  return cachedState;
}
