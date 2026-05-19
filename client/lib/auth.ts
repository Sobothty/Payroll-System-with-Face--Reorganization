const TOKEN_KEY = "pulseledger_token";
const ROLE_KEY = "pulseledger_role";
const USERNAME_KEY = "pulseledger_username";

export function getToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function getRole() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ROLE_KEY) ?? "";
}

export function getUsername() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(USERNAME_KEY) ?? "";
}

export function persistSession(accessToken: string, role: string, username: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(ROLE_KEY, role);
  window.localStorage.setItem(USERNAME_KEY, username);
  document.cookie = `${TOKEN_KEY}=${accessToken}; path=/; max-age=28800; SameSite=Lax`;
  document.cookie = `${ROLE_KEY}=${role}; path=/; max-age=28800; SameSite=Lax`;
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(USERNAME_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${ROLE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}
