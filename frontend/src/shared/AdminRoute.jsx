import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api } from "../shared/api/client"; 

export default function AdminRoute() {
  const { isAdmin, loading, error } = useAdmin();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  // redirect to login if unauthorized
  if (error?.code === 401) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // redirect to home if not admin
  if (!isAdmin || error?.code === 403) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const { data } = await api.get("/users/is-admin", {
          signal: controller.signal,
        });

        setIsAdmin(!!data.is_admin);
        setError(null);
      } catch (e) {
        if (e.name === "CanceledError") return; // ignore aborts
        setError({
          code: e?.response?.status,
          message: e?.message || "Failed to verify admin status",
        });
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  return { isAdmin, loading, error };
}