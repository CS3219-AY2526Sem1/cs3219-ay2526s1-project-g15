export default function NoMatchFound({ retry }) {
    return (
        <div className="h-[420px] w-full flex flex-col items-center justify-center gap-3">
                {/* Cross icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-16 w-16 text-[#2E2F74]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>

                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#2E2F74]">No Match Found</h2>
                  <p className="text-[#262D6C] mt-6 text-[20px]">Try again later?</p>
                </div>

                <button
                  onClick={retry}
                  className="px-6 py-2 rounded-2xl bg-[#4A53A7] text-white font-semibold hover:opacity-95"
                >
                  Retry
                </button>
              </div>
    );
}