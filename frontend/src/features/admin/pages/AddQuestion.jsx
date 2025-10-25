import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminTopNav from "../components/AdminTopNav";
import { questionService } from "../../../shared/api/questionService";

// Backend expects: "easy", "medium", "hard" (lowercase)
const DIFFICULTIES = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Difficult", value: "hard" }
];

const TOPICS = [
  "Arrays",
  "Strings",
  "Linked Lists",
  "Trees",
  "Graphs",
  "Greedy",
  "Dynamic Programming",
  "Math",
  "Hash Table",
  "Sorting",
  "Binary Search",
];

export default function AddQuestion() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "",
    topics: [],
    constraints: "",
    examples: [{ input: "", output: "", explanation: "" }],
    testCases: [{ input: "", output: "" }],
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setField = (key, val) =>
    setForm((f) => ({ ...f, [key]: val }));

  // Handle multi-select topics
  const toggleTopic = (topic) => {
    setForm((f) => ({
      ...f,
      topics: f.topics.includes(topic)
        ? f.topics.filter(t => t !== topic)
        : [...f.topics, topic]
    }));
  };
  
  // Examples
  const onAddExample = () =>
    setForm((f) => ({ 
      ...f, 
      examples: [...f.examples, { input: "", output: "", explanation: "" }] 
    }));

  const onRemoveExample = (idx) =>
    setForm((f) => ({
      ...f,
      examples: f.examples.filter((_, i) => i !== idx),
    }));

  const onChangeExample = (idx, key, val) =>
    setForm((f) => {
      const next = f.examples.slice();
      next[idx] = { ...next[idx], [key]: val };
      return { ...f, examples: next };
    });

  // Test Cases
  const onAddTestCase = () =>
    setForm((f) => ({ 
      ...f, 
      testCases: [...f.testCases, { input: "", output: "" }] 
    }));

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
    if (form.topics.length === 0) e.topics = "Select at least one topic.";
    return e;
  };

  const onCancel = () => navigate(-1);

  const onSubmit = async (evt) => {
    evt.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    if (Object.keys(eObj).length) return;

    setSubmitting(true);

    try {
      // Parse test cases - convert string inputs to JSON objects
      const parsedTestCases = form.testCases
        .filter(tc => tc.input.trim() && tc.output.trim())
        .map((tc, idx) => {
          try {
            // Try to parse as JSON first
            const inputObj = JSON.parse(tc.input);
            const outputObj = JSON.parse(tc.output);
            return { input: inputObj, output: outputObj };
          } catch (err) {
            // If JSON parsing fails, treat as string values
            console.warn(`Test case ${idx + 1} not in JSON format, using as strings:`, tc);
            return {
              input: tc.input,
              output: tc.output
            };
          }
        });

      // Check if we have valid test cases
      if (parsedTestCases.length === 0) {
        setErrors({ submit: "Please add at least one test case." });
        setSubmitting(false);
        return;
      }

      // Prepare data for backend
      const questionData = {
        title: form.title.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        topics: form.topics,
        constraints: form.constraints.trim() || undefined,
        examples: form.examples.filter(ex => ex.input.trim() || ex.output.trim()),
        test_cases: parsedTestCases,
        is_active: true
      };

      console.log("Submitting question:", questionData);
      
      await questionService.createQuestion(questionData);
      
      // navigate back to admin home if succesful
      navigate("/admin/home");
    } catch (err) {
      console.error("Failed to create question:", err);
      setErrors({ submit: err.message || "Failed to create question. Please try again." });
    } finally {
      setSubmitting(false);
    }
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
              {/* Global Error */}
              {errors.submit && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                  disabled={submitting}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Description *
                </label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7] resize-y"
                  disabled={submitting}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Difficulty *
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setField("difficulty", e.target.value)}
                  className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                  disabled={submitting}
                >
                  <option value="" disabled>
                    Select difficulty
                  </option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                {errors.difficulty && (
                  <p className="text-sm text-red-600 mt-1">{errors.difficulty}</p>
                )}
              </div>

              {/* Topics (Multi-select) */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Topics * (select at least one)
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-gray-100">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      disabled={submitting}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        form.topics.includes(topic)
                          ? "bg-[#4A53A7] text-white"
                          : "bg-white text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                {errors.topics && (
                  <p className="text-sm text-red-600 mt-1">{errors.topics}</p>
                )}
              </div>

              {/* Constraints */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Constraints (optional)
                </label>
                <textarea
                  rows={3}
                  value={form.constraints}
                  onChange={(e) => setField("constraints", e.target.value)}
                  placeholder="e.g., 1 <= nums.length <= 10^4"
                  className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7] resize-y"
                  disabled={submitting}
                />
              </div>

              {/* Examples */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Examples (optional)
                </label>
                <div className="space-y-3">
                  {form.examples.map((ex, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-2">
                      <input
                        value={ex.input}
                        onChange={(e) => onChangeExample(idx, "input", e.target.value)}
                        placeholder="Input (e.g., nums = [2,7,11,15], target = 9)"
                        className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4A53A7]"
                        disabled={submitting}
                      />
                      <input
                        value={ex.output}
                        onChange={(e) => onChangeExample(idx, "output", e.target.value)}
                        placeholder="Output (e.g., [0,1])"
                        className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4A53A7]"
                        disabled={submitting}
                      />
                      <input
                        value={ex.explanation}
                        onChange={(e) => onChangeExample(idx, "explanation", e.target.value)}
                        placeholder="Explanation (optional)"
                        className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4A53A7]"
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveExample(idx)}
                        disabled={submitting}
                        className="rounded-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 text-sm"
                      >
                        Remove Example
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onAddExample}
                  disabled={submitting}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-200 hover:bg-gray-300 px-4 py-2 text-sm"
                >
                  <span className="text-lg leading-none">＋</span>
                  Add Example
                </button>
              </div>

              {/* Test Cases */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Test Cases
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Enter test cases in JSON format (recommended) or as plain text.
                  <br />
                  Example JSON: <code className="bg-gray-200 px-1 rounded">{"{"}"nums": [2,7], "target": 9{"}"}</code> → <code className="bg-gray-200 px-1 rounded">[0,1]</code>
                </p>
                <div className="space-y-3">
                  {form.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center"
                    >
                      <textarea
                        value={tc.input}
                        onChange={(e) => onChangeTestCase(idx, "input", e.target.value)}
                        placeholder='Input: {"nums": [2,7], "target": 9} or nums = [2,7]'
                        rows={2}
                        className="rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7] font-mono text-sm resize-y"
                        disabled={submitting}
                      />
                      <textarea
                        value={tc.output}
                        onChange={(e) => onChangeTestCase(idx, "output", e.target.value)}
                        placeholder="Output: [0,1] or 7"
                        rows={2}
                        className="rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7] font-mono text-sm resize-y"
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveTestCase(idx)}
                        disabled={submitting}
                        className="justify-self-start md:justify-self-end rounded-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onAddTestCase}
                  disabled={submitting}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-200 hover:bg-gray-300 px-4 py-2 text-sm"
                >
                  <span className="text-lg leading-none">＋</span>
                  Add Test Case
                </button>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={submitting}
                  className="rounded-full bg-[#A74A4C] hover:bg-[#7c3738] text-white px-8 py-2.5 text-base font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-[#4A53A7] hover:bg-[#3b4287] text-white px-8 py-2.5 text-base font-medium disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}