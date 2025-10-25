import { useMemo, useState, useEffect, useCallback } from "react";
import AdminTopNav from "../components/AdminTopNav";
import { useNavigate } from "react-router-dom";
import { questionService } from "../../../shared/api/questionService";

const DIFF_COLOR = { 
  easy: "text-green-600", 
  medium: "text-amber-500", 
  hard: "text-red-600" 
};

const pad2 = (n) => String(n).padStart(2, "0");

export default function AdminHome() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setErr("");
      const data = await questionService.getQuestions();
      setItems(Array.isArray(data) ? data : []);
      console.log("Loaded questions:", data);
    } catch (e) {
      console.error(e);
      setErr("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(i =>
      i.title?.toLowerCase().includes(s) ||
      (i.topics && i.topics.some(t => t.toLowerCase().includes(s)))
    );
  }, [q, items]);

  const onAdd = () => navigate("/admin/add-questions");
  
  const onEdit = (item) => navigate(`/admin/questions/${item.id}/edit`);
  
  const onDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await questionService.deleteQuestion(item.id);
      setItems(prev => prev.filter(x => x.id !== item.id));
    } catch (e) {
      alert("Failed to delete question");
    }
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

              {/* Loading State */}
              {loading && (
                <div className="text-center py-8 text-gray-500">
                  Loading questions...
                </div>
              )}

              {/* Error State */}
              {err && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
                  <p className="text-red-800 text-sm">Error: {err}</p>
                  <button 
                    onClick={loadQuestions}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* List */}
              {!loading && !err && (
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                  {filtered.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {q ? 'No questions match your search' : 'No questions available'}
                    </div>
                  ) : (
                    filtered.map((item, idx) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[56px_1fr_120px_90px_90px] items-center gap-2 px-4 py-3 border-b last:border-b-0"
                      >
                        {/* index */}
                        <div className="tabular-nums text-gray-500">{pad2(idx + 1)}</div>

                        {/* Question title */}
                        <button
                          onClick={() => navigate(`/admin/questions/${item.id}`)}
                          className="text-left text-gray-900 hover:text-[#4A53A7] font-medium"
                        >
                          {item.title}
                        </button>

                        {/* difficulty */}
                        <div className={`text-sm capitalize ${DIFF_COLOR[item.difficulty] || "text-gray-600"}`}>
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
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}