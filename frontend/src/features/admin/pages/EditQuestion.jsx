import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminTopNav from "../components/AdminTopNav";
import { questionService } from "../../../shared/api/questionService";

// Backend expects: "easy", "medium", "hard" (lowercase)
const DIFFICULTIES = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Difficult", value: "hard" }
];

// strict JSON parser for test cases
const parseStrictJSON = (val) => {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  if (!trimmed) return "";
  return JSON.parse(trimmed); // will throw if invalid
};

export default function EditQuestion() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState("");

  // topics
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // add-topic
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [topicError, setTopicError] = useState("");
  // track only topics created by user
  const [userTopics, setUserTopics] = useState([]);

  // per-test-case validation errors
  const [testCaseErrors, setTestCaseErrors] = useState({});

  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "",
    topics: [],
    tags: [],
    constraints: "",
    examples: [{ input: "", output: "", explanation: "" }],
    testCases: [{ input: "", output: "" }],
  });

  // Fetch topics
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const fetchedTopics = await questionService.getTopics();
        setTopics(fetchedTopics);
      } catch (err) {
        console.error("Failed to fetch topics:", err);
        setErrors(prev => ({ ...prev, topicsFetch: "Failed to load topics. Please refresh the page." }));
      } finally {
        setLoadingTopics(false);
      }
    };

    fetchTopics();
  }, []);

  // Load question from backend
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        setLoading(true);
        const data = await questionService.getQuestion(id);
        if (!ok) return;

        setForm({
          title: data.title || "",
          description: data.description || "",
          difficulty: data.difficulty || "",
          topics: data.topics || [],
          tags: data.tags || [],
          constraints: data.constraints || "",
          // prettify examples
          examples: data.examples?.length ? data.examples : [{ input: "", output: "", explanation: "" }],
          //  when loading, pretty-print test cases so the admin sees nice JSON
          testCases: data.test_cases?.length
            ? data.test_cases.map(tc => ({
                input: typeof tc.input === "object" ? JSON.stringify(tc.input, null, 2) : (tc.input ?? ""),
                output: typeof tc.output === "object" ? JSON.stringify(tc.output, null, 2) : (tc.output ?? ""),
              }))
            : [{ input: "", output: "" }],
        });
      } catch (e) {
        console.error("Failed to load question:", e);
        setErrors({ load: "Failed to load question data" });
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [id]);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Handle multi-select topics
  const toggleTopic = (topic) => {
    setForm((f) => ({
      ...f,
      topics: f.topics.includes(topic)
        ? f.topics.filter(t => t !== topic)
        : [...f.topics, topic],
    }));
  };

  const handleAddNewTopic = () => {
    const t = newTopic.trim();
    if (!t) return;

    // check duplicates (case-insensitive)
    const exists = topics.some(
      (topic) => topic.toLowerCase() === t.toLowerCase()
    );
    if (exists) {
      setTopicError("This topic already exists");
      return;
    }

    // add to topics list and to userTopics
    setTopics((prev) => [...prev, t]);
    setUserTopics((prev) => [...prev, t]);

    // auto-select
    setForm((f) => ({
      ...f,
      topics: f.topics.includes(t) ? f.topics : [...f.topics, t],
    }));

    setNewTopic("");
    setTopicError("");
    setIsAddingTopic(false);
  };

  const handleRemoveTopic = (topicToRemove) => {
    // only allow removal if it was user-added
    if (!userTopics.includes(topicToRemove)) return;

    setTopics((prev) => prev.filter((t) => t !== topicToRemove));
    setForm((f) => ({
      ...f,
      topics: f.topics.filter((t) => t !== topicToRemove),
    }));
    setUserTopics((prev) => prev.filter((t) => t !== topicToRemove));
  };

  // Examples
  const onAddExample = () =>
    setForm(f => ({
      ...f,
      examples: [...f.examples, { input: "", output: "", explanation: "" }],
    }));

  const onRemoveExample = (idx) =>
    setForm(f => ({ ...f, examples: f.examples.filter((_, i) => i !== idx) }));

  const onChangeExample = (idx, key, val) =>
    setForm(f => {
      const next = f.examples.slice();
      next[idx] = { ...next[idx], [key]: val };
      return { ...f, examples: next };
    });

  // Test Cases
  const onAddTestCase = () =>
    setForm(f => ({ ...f, testCases: [...f.testCases, { input: "", output: "" }] }));

  const onRemoveTestCase = (idx) =>
    setForm(f => ({ ...f, testCases: f.testCases.filter((_, i) => i !== idx) }));

  const onChangeTestCase = (idx, key, val) =>
    setForm(f => {
      const next = f.testCases.slice();
      next[idx] = { ...next[idx], [key]: val };
      return { ...f, testCases: next };
    });

  // Tags
  const addTagFromInput = () => {
    const raw = tagInput.trim();
    if (!raw) return;
    const parts = raw.split(",").map(t => t.trim()).filter(Boolean);
    setForm(f => ({ ...f, tags: Array.from(new Set([...f.tags, ...parts])) }));
    setTagInput("");
  };

  const onTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTagFromInput();
    } else if (e.key === "Backspace" && !tagInput && form.tags.length) {
      setForm(f => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  };

  const removeTag = (t) =>
    setForm(f => ({ ...f, tags: f.tags.filter(x => x.toLowerCase() !== t.toLowerCase()) }));

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

    // JSON validation for test cases
    const tcErrors = {};
    const parsedTestCases = [];

    form.testCases.forEach((tc, idx) => {
      const inStr = typeof tc.input === "string" ? tc.input.trim() : JSON.stringify(tc.input ?? "");
      const outStr = typeof tc.output === "string" ? tc.output.trim() : JSON.stringify(tc.output ?? "");

      // skip completely empty rows
      if (!inStr && !outStr) return;

      try {
        const input = parseStrictJSON(inStr);
        const output = parseStrictJSON(outStr);
        parsedTestCases.push({ input, output });
      } catch (err) {
        tcErrors[idx] = "Input and output must be valid JSON.";
      }
    });

    if (Object.keys(tcErrors).length) {
      setTestCaseErrors(tcErrors);
      setSubmitting(false);
      return;
    } else {
      setTestCaseErrors({});
    }

    try {
            const cleanExamples = form.examples
        .map((ex) => {
          const input = typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input ?? "");
          const output = typeof ex.output === "string" ? ex.output : JSON.stringify(ex.output ?? "");
          return {
            input: input.trim(),
            output: output.trim(),
            explanation: (ex.explanation || "").trim(),
          };
        })
        // keep only ones that have something
        .filter(ex => ex.input || ex.output || ex.explanation);

      const questionData = {
        title: form.title.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        topics: form.topics,
        constraints: form.constraints.trim() || undefined,
        examples: cleanExamples,
        test_cases: parsedTestCases,
        is_active: true,
        tags: form.tags,
      };


      console.log("Updating question:", questionData);

      await questionService.updateQuestion(id, questionData);

      navigate("/admin/home");
    } catch (err) {
      console.error("Failed to update question:", err);
      setErrors({ submit: err.message || "Failed to update question. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const tagChips = useMemo(
    () =>
      form.tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-violet-100 text-[#4A53A7]"
        >
          {t}
          <button
            type="button"
            onClick={() => removeTag(t)}
            disabled={submitting}
            className="text-[#4A53A7]/70 hover:text-[#4A53A7] -mr-1"
            aria-label={`Remove tag ${t}`}
          >
            ×
          </button>
        </span>
      )),
    [form.tags, submitting]
  );

  return (
    <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
      <AdminTopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="rounded-2xl bg-white shadow border border-[#B9B2DE] p-6">
            <h2 className="text-center text-xl font-semibold text-[#4A53A7] mb-6">
              Edit Question
            </h2>

            {loading ? (
              <div className="py-16 text-center text-gray-500">Loading…</div>
            ) : errors.load ? (
              <div className="py-16 text-center">
                <p className="text-red-600 mb-4">{errors.load}</p>
                <button
                  onClick={() => navigate("/admin/home")}
                  className="text-[#4A53A7] hover:underline"
                >
                  Back to Questions
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                {/* Global Error */}
                {errors.submit && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                  />
                  {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Description *</label>
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7] resize-y"
                  />
                  {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Difficulty *</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setField("difficulty", e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7]"
                  >
                    <option value="" disabled>Select difficulty</option>
                    {DIFFICULTIES.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  {errors.difficulty && <p className="text-sm text-red-600 mt-1">{errors.difficulty}</p>}
                </div>

                {/* Topics*/}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Topics * (select at least one)
                  </label>
                  {loadingTopics ? (
                    <div className="p-3 rounded-xl bg-gray-100 text-center text-sm text-gray-600">
                      Loading topics...
                    </div>
                  ) : errors.topicsFetch ? (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-sm text-red-800">{errors.topicsFetch}</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-gray-100">
                      {topics.map((topic) => {
                        const isSelected = form.topics.includes(topic);
                        const isUserAdded = userTopics.includes(topic);

                        return (
                          <div
                            key={topic}
                            className={`relative flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              isSelected
                                ? "bg-[#4A53A7] text-white"
                                : "bg-white text-gray-700"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleTopic(topic)}
                              disabled={submitting}
                              className={isUserAdded ? "pr-5" : ""}
                            >
                              {topic}
                            </button>
                            {isUserAdded && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTopic(topic)}
                                disabled={submitting}
                                className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs transition ${
                                  isSelected
                                    ? "text-white hover:bg-white/20"
                                    : "text-gray-500 hover:bg-gray-200"
                                }`}
                                aria-label={`Remove ${topic}`}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Add-topic */}
                      {!isAddingTopic ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingTopic(true);
                            setTopicError("");
                          }}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                        >
                          <span className="text-base leading-none">＋</span>
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5">
                            <input
                              autoFocus
                              value={newTopic}
                              onChange={(e) => {
                                setNewTopic(e.target.value);
                                setTopicError("");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddNewTopic();
                                }
                                if (e.key === "Escape") {
                                  setIsAddingTopic(false);
                                  setNewTopic("");
                                  setTopicError("");
                                }
                              }}
                              placeholder="New topic..."
                              className="bg-transparent outline-none text-sm"
                            />
                            <button
                              type="button"
                              onClick={handleAddNewTopic}
                              className="text-[#4A53A7] text-sm font-medium"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingTopic(false);
                                setNewTopic("");
                                setTopicError("");
                              }}
                              className="text-gray-400 hover:text-gray-600 text-sm"
                              aria-label="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                          {topicError && (
                            <p className="text-xs text-red-600 ml-3">{topicError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {errors.topics && <p className="text-sm text-red-600 mt-1">{errors.topics}</p>}
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
                    disabled={submitting}
                    className="w-full rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7] resize-y"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Tags (optional)</label>
                  <div className="w-full rounded-xl bg-gray-100 px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {tagChips}
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={onTagKeyDown}
                        placeholder="Type and press Enter…"
                        disabled={submitting}
                        className="min-w-[8rem] flex-1 bg-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={addTagFromInput}
                        disabled={submitting}
                        className="rounded-full bg-gray-200 hover:bg-gray-300 px-2"
                        aria-label="Add tag"
                        title="Add tag"
                      >
                        +
                      </button>
                    </div>
                  </div>
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
                          disabled={submitting}
                          className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4A53A7]"
                        />
                        <input
                          value={ex.output}
                          onChange={(e) => onChangeExample(idx, "output", e.target.value)}
                          placeholder="Output (e.g., [0,1])"
                          disabled={submitting}
                          className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4A53A7]"
                        />
                        <input
                          value={ex.explanation}
                          onChange={(e) => onChangeExample(idx, "explanation", e.target.value)}
                          placeholder="Explanation (optional)"
                          disabled={submitting}
                          className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4A53A7]"
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
                  <label className="block text-sm font-medium text-gray-800 mb-2">Test Cases</label>
                  <p className="text-xs text-gray-600 mb-3">
                    Enter test cases in <strong>JSON format (required)</strong>.
                    Example input: <code>{"{\"nums\":[2,7,11,15],\"target\":9}"}</code>
                  </p>
                  <div className="space-y-3">
                    {form.testCases.map((tc, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-start">
                        <textarea
                          value={tc.input}
                          onChange={(e) => onChangeTestCase(idx, "input", e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (!val) return;
                            try {
                              const parsed = JSON.parse(val);
                              onChangeTestCase(idx, "input", JSON.stringify(parsed, null, 2));
                              setTestCaseErrors(prev => {
                                const { [idx]: _, ...rest } = prev;
                                return rest;
                              });
                            } catch {
                              setTestCaseErrors(prev => ({
                                ...prev,
                                [idx]: "Must be valid JSON.",
                              }));
                            }
                          }}
                          placeholder='{"nums":[2,7], "target":9}'
                          rows={2}
                          disabled={submitting}
                          className="rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7] font-mono text-sm resize-y"
                        />
                        <textarea
                          value={tc.output}
                          onChange={(e) => onChangeTestCase(idx, "output", e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (!val) return;
                            try {
                              const parsed = JSON.parse(val);
                              onChangeTestCase(idx, "output", JSON.stringify(parsed, null, 2));
                              setTestCaseErrors(prev => {
                                const { [idx]: _, ...rest } = prev;
                                return rest;
                              });
                            } catch {
                              setTestCaseErrors(prev => ({
                                ...prev,
                                [idx]: "Must be valid JSON.",
                              }));
                            }
                          }}
                          placeholder='[0,1]'
                          rows={2}
                          disabled={submitting}
                          className="rounded-xl bg-gray-100 px-4 py-2 outline-none focus:ring-2 focus:ring-[#4A53A7] font-mono text-sm resize-y"
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveTestCase(idx)}
                          disabled={submitting}
                          className="justify-self-start md:justify-self-end rounded-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 text-sm"
                          aria-label={`Remove test case ${idx + 1}`}
                        >
                          Remove
                        </button>
                        {testCaseErrors[idx] && (
                          <p className="text-xs text-red-600 md:col-span-3">{testCaseErrors[idx]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={onAddTestCase}
                      disabled={submitting}
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
