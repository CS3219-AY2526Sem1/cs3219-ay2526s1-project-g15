import { useMemo, useState } from "react";
import AdminTopNav from "../components/AdminTopNav";
import { useNavigate } from "react-router-dom";

const DIFF_COLOR = {
  Easy: "text-green-600",
  Medium: "text-amber-500",
  Difficult: "text-red-600",
};

const pad2 = (n) => String(n).padStart(2, "0");

// TODO: replace hardcoded data with DB data
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

export default function AdminHome() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [items, setItems] = useState(INITIAL);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(s) ||
        i.topic.toLowerCase().includes(s)
    );
  }, [q, items]);

  const onAdd = () => navigate("/admin/add-questions"); 
  const onEdit = (item) => navigate(`/admin/questions/${item.id}/edit`);
  const onDelete = (item) => {
    const ok = window.confirm(`Delete "${item.title}"? This cannot be undone.`);
    if (ok) setItems((prev) => prev.filter((x) => x.id !== item.id));
  };


  return (
    <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
      <AdminTopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex gap-6">
            <section className="flex-1 rounded-2xl bg-white p-6 shadow border border-gray-200">
              <div className="flex items-center justify-between gap-4 mb-4">
                {/* Search */}
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

                {/* Add Questions button */}
                <button
                  onClick={onAdd}
                  className="inline-flex items-center justify-center rounded-full bg-[#4C8954] hover:bg-[#335c39]
                             text-white px-6 py-2 text-sm font-medium transition"
                >
                  Add Questions
                </button>
              </div>

              {/* List */}
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                {filtered.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[56px_1fr_120px_90px_90px] items-center gap-2 px-4 py-3 border-b last:border-b-0"
                  >
                    {/* index */}
                    <div className="tabular-nums text-gray-500">{pad2(idx + 1)}</div>

                    {/* Question title */}
                    <button
                      onClick={() => alert(`Open "${item.title}" (mock)`)}
                      className="text-left text-gray-900 hover:text-[#4A53A7] font-medium"
                    >
                      {item.title}
                    </button>

                    {/* difficulty */}
                    <div className={`text-sm ${DIFF_COLOR[item.difficulty] || "text-gray-600"}`}>
                      {item.difficulty}
                    </div>

                    {/* edit */}
                    <div className="justify-self-end">
                      <button
                        onClick={() => onEdit(item)}
                        className="rounded-full bg-[#68659A] hover:bg-[#595684] text-white px-4 py-1.5 text-sm font-medium transition"
                      >
                        Edit
                      </button>
                    </div>

                    {/* delete */}
                    <div className="justify-self-end">
                      <button
                        onClick={() => onDelete(item)}
                        className="rounded-full bg-[#A74A4C] hover:bg-[#7c3738] text-white px-4 py-1.5 text-sm font-medium transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
