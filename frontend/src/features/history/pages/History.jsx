import { useEffect, useMemo, useState } from "react";
import TopNav from "../../../shared/components/TopNav";
import OngoingMeetingCard from "../../home/components/OngoingMeetingCard";
import { listMyAttempts, myAttemptsSummary } from "../../../shared/api/attemptsApi";
import { questionService, countQuestions } from "../../../shared/api/questionService";

const CheckIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const DIFF_COLOR = {
  Easy: "text-green-600",
  Medium: "text-amber-500",
  Difficult: "text-red-600",
};

const pad2 = (n) => String(n).padStart(2, "0");

export default function History() {
  const [hasOngoingMeeting, setHasOngoingMeeting] = useState(true);
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);

  const [solvedCount, setSolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalPool, setTotalPool] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const attempts = (await listMyAttempts({ limit: 200, offset: 0 }))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const summary = await myAttemptsSummary().catch(() => null);
        setSolvedCount(summary?.solved ?? attempts.filter(a => a.is_solved).length);

        const questionIds = [...new Set(attempts.map(a => a.question_id))];
        const questions = await Promise.all(
          questionIds.map(id => questionService.getQuestion(id).catch(() => null))
        );

        const questionMap = Object.fromEntries(
          questions.filter(Boolean).map(q => [q.id, q])
        );

        const ui = attempts.map((a, idx) => {
          const q = questionMap[a.question_id];
          return {
            id: idx + 1,
            title: q?.title ?? `Question #${a.question_id}`,
            topic: (q?.topics && q.topics[0]) || "-",
            difficulty: q?.difficulty || "-",
            solved: !!a.is_solved,
          };
        });
        setItems(ui);
      } catch (err) {
        console.error("Failed to load attempts:", err);
        setItems([]);
        setSolvedCount(0);
      } finally {
        setLoading(false);
      }
      try {
        const total = questionService.getTotalCount();
        setTotalPool(total);
      } catch (e) {
        console.warn("countQuestions failed:", e);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(s) ||
        i.topic.toLowerCase().includes(s)
    );
  }, [q, items]);

  return (
    <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex gap-6">
            {hasOngoingMeeting && (
              <OngoingMeetingCard
                onRejoin={() => alert("Rejoin meeting (mock)")}
                className="h-full"
              />
            )}

            <section className="flex-1 rounded-2xl bg-white p-6 shadow border border-gray-200">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="relative w-full max-w-md">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="7" /> 
                      <path d="M21 21l-4.3-4.3" />
                    </svg>
                  </span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-full bg-[#6F66A7] text-white placeholder-white/80
                               pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckIcon className="h-6 w-6 text-[#4C8954]" />
                  <span>{solvedCount}/{totalPool} attempts solved</span>
                </div>
              </div>

              {/* List */}
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[56px_1fr_160px_110px_40px] items-center gap-2 px-4 py-3
                               border-b last:border-b-0"
                  >
                    {/* index */}
                    <div className="tabular-nums text-gray-500">{pad2(item.id)}</div>

                    {/* title */}
                    <button
                      onClick={() => alert(`Open "${item.title}" (mock)`)}
                      className="text-left text-gray-900 hover:text-[#4A53A7] font-medium"
                    >
                      {item.title}
                    </button>

                    {/* topic chip */}
                    <div className="justify-self-start">
                      <span className="inline-block px-3 py-1 rounded-full text-sm bg-violet-100 text-[#4A53A7]">
                        {item.topic}
                      </span>
                    </div>

                    {/* difficulty */}
                    <div className={`text-sm ${DIFF_COLOR[item.difficulty] || "text-gray-600"}`}>
                      {item.difficulty}
                    </div>

                    {/* solved tick */}
                    <div className="mx-auto text-[#4C8954]">
                      {item.solved && <CheckIcon className="h-5 w-5" />}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* demo toggle for the left sidebar */}
          <div className="mt-6 text-sm text-gray-600">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasOngoingMeeting}
                onChange={(e) => setHasOngoingMeeting(e.target.checked)}
              />
              Show “ongoing meeting” sidebar
            </label>
          </div>
        </div>
      </main>
    </div>
  );
}
