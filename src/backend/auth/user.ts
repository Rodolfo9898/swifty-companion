export { userAuth } from './session';
import { userAuth } from './session';

export async function loginWith42() {
  return userAuth.login();
}

export async function refreshAccessToken() {
  return userAuth.refresh();
}

export async function ensureAccessToken() {
  return userAuth.ensureToken();
}

export async function getAuthState() {
  return userAuth.getState();
}

export async function logout() {
  return userAuth.logout();
}
