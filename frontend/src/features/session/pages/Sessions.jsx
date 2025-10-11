import { useMemo, useState } from "react";
import TopNav from "../../../shared/components/TopNav";
import OngoingMeetingCard from "../../home/components/OngoingMeetingCard";

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

// TODO: change fake, hardcoded data to data that is in database
const INITIAL = [
  { id: 1, title: "Interview Question 1", topic: "Arrays",       difficulty: "Easy",      solved: true  },
  { id: 2, title: "Interview Question 2", topic: "Strings",      difficulty: "Easy",      solved: false },
  { id: 3, title: "Interview Question 3", topic: "Graphs",       difficulty: "Medium",    solved: false },
  { id: 4, title: "Interview Question 4", topic: "Linked Lists", difficulty: "Easy",      solved: false },
  { id: 5, title: "Interview Question 5", topic: "DP",           difficulty: "Difficult", solved: true  },
  { id: 6, title: "Interview Question 6", topic: "Trees",        difficulty: "Difficult", solved: false },
  { id: 7, title: "Interview Question 7", topic: "Greedy",       difficulty: "Medium",    solved: false },
  { id: 8, title: "Interview Question 8", topic: "Math",         difficulty: "Medium",    solved: false },
];

export default function Sessions() {
  const [hasOngoingMeeting, setHasOngoingMeeting] = useState(true);
  const [q, setQ] = useState("");
  const [items] = useState(INITIAL);

  const solvedCount = items.filter((i) => i.solved).length;
  // TODO: change to questions that are in database
  const TOTAL_POOL = 4829;

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
                  <span>{solvedCount}/{TOTAL_POOL} attempts solved</span>
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
