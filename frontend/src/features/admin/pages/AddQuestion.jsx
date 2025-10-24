import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminTopNav from "../components/AdminTopNav";

const DIFFICULTIES = ["Easy", "Medium", "Difficult"];
const TOPICS = [
  "Arrays",
  "Strings",
  "Linked Lists",
  "Trees",
  "Graphs",
  "Greedy",
  "DP",
  "Math",
];

export default function AddQuestion() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "",
    topics: "",
    tags: "",
    testCases: [{ in: "", out: "" }],
  });

  const [errors, setErrors] = useState({});

  const setField = (key, val) =>
    setForm((f) => ({ ...f, [key]: val }));

  const onAddTestCase = () =>
    setForm((f) => ({ ...f, testCases: [...f.testCases, { in: "", out: "" }] }));

  const onRemoveTestCase = (idx) =>
    setForm((f) => ({
      ...f,
      testCases: f.testCases.filter((_, i) => i !== idx),
    }));

  const onChangeTestCase = (idx, key, val) =>
    setForm((f) => {
      const next = f.testCases.slice();
      next[idx] = { ...next[idx], [key]: val };
      return { ...f, testCases: next };
    });

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.difficulty) e.difficulty = "Choose a difficulty.";
    return e;
  };

  const onCancel = () => navigate(-1);

  const onSubmit = (e) => {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length) return;

    // TODO: replace with API call
    // await api.questions.create(...)
    console.log("Submitting new question:", form);

    navigate("/admin/home"); 
  };

  return (
    <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
      <AdminTopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="rounded-2xl bg-white shadow border border-[#B9B2DE] p-6">
            <h2 className="text-center text-xl font-semibold text-[#4A53A7] mb-6">
              New Question
            </h2>

            <form onSubmit={onSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Description
                </label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7] resize-y"
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Difficulty
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setField("difficulty", e.target.value)}
                  className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                >
                  <option value="" disabled>
                    Select difficulty
                  </option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.difficulty && (
                  <p className="text-sm text-red-600 mt-1">{errors.difficulty}</p>
                )}
              </div>

              {/* Topics*/}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Topics
                </label>
                <select
                  value={form.topics}
                  onChange={(e) => setField("topics", e.target.value)}
                  className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                >
                  <option value="" disabled>
                    Select topic
                  </option>
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Tags (separate each tag with a comma)
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => setField("tags", e.target.value)}
                  placeholder="Google, Technical Interview Question"
                  className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                />
                {!!form.tags.trim() && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full text-xs bg-violet-100 text-[#4A53A7]"
                        >
                          {t}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Test Cases */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Test Cases
                </label>

                <div className="space-y-3">
                  {form.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center"
                    >
                      <input
                        value={tc.in}
                        onChange={(e) => onChangeTestCase(idx, "in", e.target.value)}
                        placeholder='Input (e.g., "[1,2,3]")'
                        className="rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                      />
                      <input
                        value={tc.out}
                        onChange={(e) => onChangeTestCase(idx, "out", e.target.value)}
                        placeholder="Expected Output"
                        className="rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveTestCase(idx)}
                        className="justify-self-start md:justify-self-end rounded-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 text-sm"
                        aria-label={`Remove test case ${idx + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onAddTestCase}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-200 hover:bg-gray-300 px-4 py-2 text-sm"
                  >
                    <span className="text-lg leading-none">＋</span>
                    Add Test Case
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-full bg-[#A74A4C] hover:bg-[#7c3738] text-white px-8 py-2.5 text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#4A53A7] hover:bg-[#3b4287] text-white px-8 py-2.5 text-base font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
