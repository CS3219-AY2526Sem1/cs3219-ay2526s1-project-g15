import axios from "axios";
import { getRefreshToken, saveTokens } from "./token";

const BASE = `${process.env.REACT_APP_API_GATEWAY_URL || ""}/api/v1/users`;

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  try {
    const res = await axios.post(`${BASE}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token } = res.data;

    if (!access_token) {
      throw new Error("No access_token in refresh response");
    }

    saveTokens({
      access: access_token,
      refresh: refresh_token ?? refreshToken,
    });

    return access_token;
  } catch (err) {
    console.error("Failed to refresh access token:", err);
    throw err;
  }
}
