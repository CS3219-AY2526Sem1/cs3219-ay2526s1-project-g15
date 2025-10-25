import { useEffect, useRef, useState } from "react";
import { Link,useNavigate } from "react-router-dom";
import { api } from "../../../shared/api/client";

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const click = (e) => !ref.current?.contains(e.target) && onClose?.();
    const esc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose, ref]);
}

export default function AdminProfileMenu({
  avatarSrc,
  onLogout = () => alert("Logging you out now"),
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useClickOutside(ref, () => setOpen(false));

   const handleLogout = async () => {
    setOpen(false);
    try {
      await api.post("/auth/logout");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("forgotPasswordEmail");
      localStorage.removeItem("emailVerificationCode");
      await onLogout?.();
    } finally {
        // go back to landing page once logged out
      navigate("/"); 
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-[30px] w-[30px] rounded-full  grid place-items-center hover:opacity-95 focus:outline-none"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {<img src={avatarSrc} alt="Profile" className="h-full w-full rounded-full object-cover" />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-200 p-1 z-50"
        >
          <Link
            to="/admin/profile/edit"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-[#2E2F74]"
          >
            <span className="inline-grid place-items-center h-6 w-6 rounded-full bg-violet-100 text-[#4A53A7] font-semibold">👤</span>
            View profile
          </Link>
          <div className="h-px bg-gray-200 my-1" />
          <button
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-[#2E2F74]"
          >
            <span className="inline-grid place-items-center h-6 w-6 rounded-full bg-violet-100 text-[#4A53A7] font-semibold">↪</span>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
