export default function ConfirmMatch({ confirmMatch, cancelSearch }) {
    return (
        <div className="h-[420px] w-full flex flex-col items-center justify-center gap-3">
            {/* Checkmark icon */}
            <svg
                viewBox="0 0 24 24"
                className="h-12 w-12 mb-2 text-[#2E2F74]"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
            >
                <path d="M20 6L9 17l-5-5" />
            </svg>

            <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-[#2E2F74]">Match Found!</h2>
                <p className="text-[#262D6C] mt-6 text-[20px]">Click to confirm collaboration:</p>
            </div>

            <div className="flex gap-4">
                <button
                onClick={cancelSearch}
                className="px-6 py-2 rounded-2xl bg-[#A74A4C] text-white font-semibold hover:opacity-95"
                >
                Cancel
                </button>
                <button
                onClick={confirmMatch}
                className="px-6 py-2 rounded-2xl bg-[#4A53A7] text-white font-semibold hover:opacity-95"
                >
                Confirm
                </button>
            </div>
        </div>
    );
}