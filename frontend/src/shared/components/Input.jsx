import { useState } from "react";

export default function Input({
  label,
  error,
  className = "",
  revealable = false,
  type = "text",
  ...props
}) {
  const [show, setShow] = useState(false);
  const isPw = type === "password" && revealable;

  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm text-white">{label}</span>}

      <div className="relative">
        <input
          type={isPw && show ? "text" : type}
          className={`w-full rounded-xl bg-[#68659A] font-semibold text-white placeholder-white
                      px-4 py-3 outline-none focus:ring-2 focus:ring-[#262D6C]
                      ${isPw ? "pr-12" : ""} ${className}`}
          {...props}
        />

        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 inset-y-0 my-auto h-8 w-8 grid place-items-center
                       text-white/80 hover:text-white focus:outline-none"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? (
              // eye off
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l18 18" />
                <path d="M10.58 10.58a3 3 0 104.24 4.24" />
                <path d="M9.88 5.09A9.77 9.77 0 0121 12c-.86 1.37-2.05 2.55-3.47 3.43M6.53 6.56A9.77 9.77 0 003 12c.86 1.37 2.05 2.55 3.47 3.43A9.77 9.77 0 0012 18c1.23 0 2.4-.22 3.47-.57" />
              </svg>
            ) : (
              // eye on
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </label>
  );
}
