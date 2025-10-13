export default function OngoingMeetingCard({ onRejoin }) {
  return (
    <aside className="w-[280px] rounded-2xl bg-[#5F5699] text-white p-5 shadow
                      border border-white/10">
      <h2 className="text-xl font-bold leading-snug">You have an ongoing{" "}
        <br/>meeting!</h2>

      <button
        onClick={onRejoin}
        className="mt-5 inline-flex items-center justify-center rounded-xl
                   bg-white text-[#2E2F74] font-semibold px-4 py-2 hover:opacity-95"
      >
        Rejoin meeting
      </button>
    </aside>
  );
}
