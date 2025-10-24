import { api } from "../../shared/api/client";

// POST /auth/register
export async function register(payload) {
  const { data } = await api.post("/auth/register", payload);
  if (data && data.access_token) localStorage.setItem("accessToken", data.access_token);
  return data;
}

// POST /auth/login
export async function login(payload) {
  const { data } = await api.post("/auth/login", payload);
  if (data && data.access_token) localStorage.setItem("accessToken", data.access_token);
  return data;
}

// POST /auth/forgot-password
export function forgotPassword(email) {
  return api.post("/auth/forgot-password", { email });
}

// POST /auth/reset-password
export function resetPassword(email, code, new_password) {
  return api.post("/auth/reset-password", { email, code, new_password });
}

// GET /auth/verify-email?token=...
// NOTE: implement this only if your backend actually provides it.
// If not yet implemented, your EmailVerified page should handle 404/400 nicely.
export function verifyEmail(token) {
  return api.get("/auth/verify-email", { params: { token } });
}

// GET /users/me
export async function me() {
  const { data } = await api.get("/users/me");
  return data; // { id, email, name, role }
}

// (optional) GET /users/is-admin if you add it later
export async function isAdmin() {
  const { data } = await api.get("/users/is-admin");
  return data; // { is_admin: boolean }
}

export async function verifyPassword(password) {
  const { data } = await api.post("/auth/verify-password", { password });
  return data; // { ok: boolean }
}

export function updateProfile(payload) {
  return api.put("/users/me", payload);
}

export function deleteAccount() {
  return api.delete("/users/me");
}