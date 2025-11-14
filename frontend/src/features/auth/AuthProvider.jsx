import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, register as apiRegister, me as apiMe } from "./api";
import { setAccessToken } from "../../shared/api/client";

const AuthCtx = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On load, try fetch /users/me if a token exists (you can add your own rehydration later)
  useEffect(() => {
    (async () => {
      try {
        const u = await apiMe();
        setUser(u);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    await apiLogin({ email, password });
    const u = await apiMe();
    setUser(u);
  };

  const register = async (username, email, password) => {
    await apiRegister({ username, email, password });
    // common flow: redirect to “check your email” page from the calling component
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
