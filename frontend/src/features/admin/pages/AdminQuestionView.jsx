import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminTopNav from "../components/AdminTopNav";
import { CodeEditor } from "../../session/components/code_panel";
import { questionService } from "../../../shared/api/questionService";
import { formatScalarDisplay } from "../../../shared/utils/ioFormat";

const DIFF_COLOR = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
};


export default function AdminQuestionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  
  // Code editor state
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

  const formatObjectAsLines = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return formatScalarDisplay(obj);
    }
    return Object.entries(obj)
      .map(([k, v]) => `${k} = ${formatScalarDisplay(v)}`)
      .join("\n");
  };

  useEffect(() => {
    loadQuestion();
  }, [id]);

  useEffect(() => {
  // Set default code template when question loads
  if (question?.function_name) {
    const templates = {
      javascript: `function ${question.function_name}(/* params */) {\n  // Write your solution here\n  \n}`,
      python: `def ${question.function_name}(...):\n    # Write your solution here\n    pass`,
    };
    setCode(templates[language] || templates.javascript);
  } else {
    // Fallback when no function name is defined
    setCode(`// This is a preview of how users will see the code editor
// The actual editor will allow users to write code here

function solution() {
  // Write your solution here
}`);
  }
}, [question, language]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await questionService.getQuestion(id);
      setQuestion(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load question");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
        <AdminTopNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-600">Loading question...</div>
        </main>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
        <AdminTopNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "Question not found"}</p>
            <button
              onClick={() => navigate("/admin/home")}
              className="text-[#4A53A7] hover:underline"
            >
              Back to Questions
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
      <AdminTopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Admin Actions Bar */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => navigate("/admin/home")}
              className="text-[#4A53A7] hover:text-[#3b4287] font-medium flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Questions
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/admin/questions/${id}/edit`)}
                className="rounded-full bg-[#68659A] hover:bg-[#595684] text-white px-6 py-2 text-sm font-medium transition"
              >
                Edit Question
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Question details - Fixed overflow */}
            <div className="rounded-2xl bg-white p-6 shadow border border-gray-200 h-fit overflow-hidden">
              {/* Title & Difficulty */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-3 break-words overflow-wrap-anywhere">
                  {question.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                      DIFF_COLOR[question.difficulty]
                    }`}
                  >
                    {question.difficulty}
                  </span>
                  {question.topics && question.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {question.topics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md bg-[#6F66A7] text-white text-xs break-words"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6 overflow-hidden">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  Description
                </h2>
                <div
                  className="
                    text-gray-800 leading-relaxed break-words overflow-wrap-anywhere
                    max-w-full prose prose-sm max-w-none
                    [&_img]:max-w-full [&_img]:h-auto
                    [&_pre]:overflow-x-auto
                    [&_pre]:bg-white
                    [&_pre]:text-black
                    [&_pre]:border
                    [&_pre]:border-gray-300
                    [&_pre]:rounded-md
                    [&_pre]:p-3
                    [&_pre]:shadow-sm
                    [&_code]:bg-transparent
                    [&_code]:text-black
                  "
                  dangerouslySetInnerHTML={{ __html: question.description }}
                />
              </div>

              {/* Examples */}
              {question.examples && question.examples.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">
                    Examples
                  </h2>
                  {question.examples.map((example, idx) => (
                    <div
                      key={idx}
                      className="mb-4 p-4 rounded-lg border border-gray-200 overflow-hidden bg-transparent"
                    >

                      <p className="font-medium text-gray-800 mb-1">
                        Example {idx + 1}:
                      </p>
                      {example.input && (
                        <div className="mb-2 overflow-hidden">
                          <span className="text-sm font-medium text-gray-800">
                            Input:{" "}
                          </span>
                          <code className="text-sm text-gray-800 whitespace-pre-wrap break-words overflow-wrap-anywhere block">
                            {typeof example.input === "object"
                              ? formatObjectAsLines(example.input)
                              : formatScalarDisplay(example.input)}
                          </code>
                        </div>
                      )}

                      {example.output && (
                        <div className="mb-2 overflow-hidden">
                          <span className="text-sm font-medium text-gray-800">
                            Output:{" "}
                          </span>
                          <code className="text-sm text-gray-800 whitespace-pre-wrap break-words overflow-wrap-anywhere block">
                            {typeof example.output === "object"
                              ? formatObjectAsLines(example.output)
                              : formatScalarDisplay(example.output)}
                          </code>
                        </div>
                      )}

                      {example.explanation && (
                        <div className="overflow-hidden">
                          <span className="text-sm font-medium text-gray-800">
                            Explanation:{" "}
                          </span>
                          <span className="text-sm text-gray-700 break-words overflow-wrap-anywhere">
                            {example.explanation}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints */}
              {question.constraints && (
                <div className="mb-6 overflow-hidden">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">
                    Constraints
                  </h2>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {question.constraints}
                  </div>
                </div>
              )}
            </div>

            {/* Code Editor with Test Cases */}
            <div className="flex flex-col gap-6">
              {/* Code Editor */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-gray-700 text-sm font-medium">
                    Code Editor (Preview)
                  </span>
                </div>
                <CodeEditor
                  readOnly
                  value={code}
                  onChange={setCode}
                  language={language}
                  onLanguageChange={setLanguage}
                  expectedFnName={question.function_name}
                  height="400px"
                />
              </div>

              {/* Test Cases Panel */}
              <div className="rounded-2xl overflow-hidden bg-[#1e1e1e] border border-gray-800 flex flex-col">
                {/* Tabs */}
                <div className="bg-[#2d2d2d] border-b border-gray-700">
                  <div className="flex items-center gap-1 px-4 pt-3">
                    {question.test_cases && question.test_cases.length > 0 ? (
                      question.test_cases.slice(0, 3).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveTab(idx)}
                          className={`px-4 py-2 text-sm rounded-t transition ${
                            activeTab === idx
                              ? "bg-[#1e1e1e] text-white"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          Case {idx + 1}
                        </button>
                      ))
                    ) : (
                      <span className="px-4 py-2 text-sm text-gray-400">
                        No test cases
                      </span>
                    )}
                  </div>
                </div>

                {/* Test Case Content */}
                <div className="p-4 bg-[#1e1e1e]">
                  {question.test_cases && question.test_cases[activeTab] ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-gray-400 text-sm mb-1">Input:</div>
                        <div className="bg-[#2d2d2d] p-3 rounded text-gray-200 text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                          {typeof question.test_cases[activeTab].input ===
                          "object"
                            ? formatObjectAsLines(
                                question.test_cases[activeTab].input
                              )
                            : formatScalarDisplay(
                                question.test_cases[activeTab].input
                              )}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm mb-1">
                          Expected Output:
                        </div>
                        <div className="bg-[#2d2d2d] p-3 rounded text-gray-200 text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                          {typeof question.test_cases[activeTab].output ===
                          "object"
                            ? formatObjectAsLines(
                                question.test_cases[activeTab].output
                              )
                            : formatScalarDisplay(
                                question.test_cases[activeTab].output
                              )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      No test case data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}