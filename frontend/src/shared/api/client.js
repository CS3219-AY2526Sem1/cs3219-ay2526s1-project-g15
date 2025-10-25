import axios from "axios";

const ROOT = process.env.REACT_APP_API_BASE_URL || "/api/v1";
const BASE = `${ROOT}/users`;

export const api = axios.create({
  baseURL: BASE,
  withCredentials: false, // flip to true if you move to HttpOnly cookies later
});

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
