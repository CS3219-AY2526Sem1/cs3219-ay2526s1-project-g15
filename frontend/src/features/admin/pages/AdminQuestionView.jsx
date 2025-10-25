import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminTopNav from "../components/AdminTopNav";
import { questionService } from "../../../shared/api/questionService";

const DIFF_COLOR = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700"
};

export default function AdminQuestionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadQuestion();
  }, [id]);

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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
            {/* Question Details */}
            <div className="rounded-2xl bg-white p-6 shadow border border-gray-200 h-fit">
              
              {/* Title & Difficulty */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  {question.title}
                </h1>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${DIFF_COLOR[question.difficulty]}`}>
                    {question.difficulty}
                  </span>
                  {question.topics && question.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {question.topics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md bg-[#6F66A7] text-white text-xs"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Description</h2>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {question.description}
                </div>
              </div>

              {/* Examples */}
              {question.examples && question.examples.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">Examples</h2>
                  {question.examples.map((example, idx) => (
                    <div key={idx} className="mb-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="font-medium text-gray-800 mb-1">Example {idx + 1}:</p>
                      {example.input && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-600">Input: </span>
                          <code className="text-sm text-gray-800">{example.input}</code>
                        </div>
                      )}
                      {example.output && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-600">Output: </span>
                          <code className="text-sm text-gray-800">{example.output}</code>
                        </div>
                      )}
                      {example.explanation && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Explanation: </span>
                          <span className="text-sm text-gray-700">{example.explanation}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints */}
              {question.constraints && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Constraints</h2>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {question.constraints}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white shadow border border-gray-200 overflow-hidden">
              {/* Code Editor (Read-only) */}
              <div className="bg-[#1e1e1e] p-4 min-h-[400px]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Code Editor (Preview)</span>
                  </div>
                  <span className="text-xs text-gray-500 italic">Read-only view</span>
                </div>
                <pre className="text-gray-300 text-sm font-mono">
                  {`// This is a preview of how users will see the code editor
// The actual editor will allow users to write code here

function solution() {
  // Write your solution here
}`
                  }
                </pre>
              </div>

              {/* Test Cases Tabs */}
              <div className="bg-[#2d2d2d] border-t border-gray-700">
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
                    <span className="px-4 py-2 text-sm text-gray-400">No test cases</span>
                  )}
                </div>
              </div>

              {/* Test Case Content */}
              <div className="bg-[#1e1e1e] p-4 min-h-[200px]">
                {question.test_cases && question.test_cases[activeTab] ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Input:</div>
                      <div className="bg-[#2d2d2d] p-3 rounded text-gray-200 text-sm font-mono overflow-x-auto">
                        {typeof question.test_cases[activeTab].input === 'object'
                          ? JSON.stringify(question.test_cases[activeTab].input, null, 2)
                          : question.test_cases[activeTab].input}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-1">Expected Output:</div>
                      <div className="bg-[#2d2d2d] p-3 rounded text-gray-200 text-sm font-mono overflow-x-auto">
                        {typeof question.test_cases[activeTab].output === 'object'
                          ? JSON.stringify(question.test_cases[activeTab].output, null, 2)
                          : question.test_cases[activeTab].output}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">No test case data available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}