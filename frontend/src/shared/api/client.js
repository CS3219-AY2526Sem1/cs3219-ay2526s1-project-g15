import axios from "axios";

const ROOT = process.env.REACT_APP_API_BASE_URL || "/api/v1";
const BASE = `${ROOT}/users`;

export const api = axios.create({
  baseURL: BASE,
  withCredentials: false, // flip to true if you move to HttpOnly cookies later
});

// simple in-memory access token (lost on reload)
let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
