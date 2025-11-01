import { useEffect, useState } from "react";
import { me } from "../../auth/api";

export default function useUserDetails() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await me();
        setUser(res);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  return {
    user,
    userId: user?.id ?? null,
    username: user?.name ?? "Guest",
    loading,
    error,
  };
}
