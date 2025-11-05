import axios from "axios";

const GATEWAY = process.env.REACT_APP_API_GATEWAY_URL || "";
export const attemptsApi = axios.create({
  baseURL: `${GATEWAY}/api/v1/attempts`,
  withCredentials: false,
});

attemptsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function listMyAttempts({ limit = 100, offset = 0 } = {}) {
  const { data } = await attemptsApi.get("/me", { params: { limit, offset } });
  return data; // AttemptRead[]
}

export async function myAttemptsSummary() {
  const { data } = await attemptsApi.get("/me/summary");
  return data; // { total_attempts, solved, last_attempt_at }
}
