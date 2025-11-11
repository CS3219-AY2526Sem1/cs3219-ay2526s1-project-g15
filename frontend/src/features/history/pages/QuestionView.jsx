import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopNav from "../../../shared/components/TopNav";
import { CodeEditor } from "../../session/components/code_panel";
import { questionService } from "../../../shared/api/questionService";
import {
  parseRelaxed,
  prettyPrintInput,
  prettyPrintOutput,
  formatScalarDisplay,
} from "../../../shared/utils/ioFormat";
import { filenameByLang } from "../../session/constants";
import { getFunctionName } from "../../../shared/utils/HarnessBuilders";
import {
  getAttemptById,
  listMyAttempts,
} from "../../../shared/api/attemptsApi";

const DIFF_COLOR = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
};

export default function QuestionView() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        let foundAttempt;
        try {
          foundAttempt = await getAttemptById(attemptId);
        } catch {
          const resp = await listMyAttempts({ limit: 200, offset: 0 });
          const attempts = Array.isArray(resp)
            ? resp
            : resp.items || resp.data || [];
          foundAttempt = attempts.find((a) => String(a.id) === String(attemptId));
        }

        if (!foundAttempt) {
          if (!cancelled) setError("Attempt not found");
          return;
        }

        if (!cancelled) setAttempt(foundAttempt);

        const qid =
          foundAttempt.question_id ??
          foundAttempt.questionId ??
          foundAttempt.question?.id;

        if (qid) {
          const q = await questionService.getQuestion(qid);
          if (!cancelled) setQuestion(q);
        } else {
          if (!cancelled) setError("No question linked to this attempt");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Failed to load attempt or question");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const uiTests = useMemo(() => {
    if (!question || !Array.isArray(question.test_cases)) return [];
    return question.test_cases.map((tc, idx) => {
      let parsedInput = tc.input;
      if (typeof tc.input === "string") {
        const relaxed = parseRelaxed(tc.input);
        if (relaxed !== null) parsedInput = relaxed;
      }
      const inputDisplay = prettyPrintInput(parsedInput);
      const outputDisplay =
        typeof tc.output === "string"
          ? tc.output
          : prettyPrintOutput(tc.output);
      return {
        id: idx + 1,
        raw: tc,
        inputDisplay,
        outputDisplay,
      };
    });
  }, [question]);

  const testsWithVerdict = useMemo(() => {
    if (!attempt) return uiTests;

    if (Array.isArray(attempt.testCaseResults)) {
      const map = {};
      attempt.testCaseResults.forEach((r) => {
        map[r.id] = r;
      });
      return uiTests.map((tc) => {
        const res = map[tc.id];
        const userOut =
          typeof res?.userOutput === "string"
            ? res.userOutput
            : res?.userOutput
            ? JSON.stringify(res.userOutput, null, 2)
            : "";
        return {
          ...tc,
          status: res ? (res.isCorrect ? "pass" : "fail") : "pending",
          userOutput: userOut,
        };
      });
    }

    if (attempt.case_outputs && typeof attempt.case_outputs === "object") {
      return uiTests.map((tc) => {
        const userOut = attempt.case_outputs[tc.id];
        let status = "pending";
        if (userOut !== undefined) {
          status =
            String(userOut).trim() === String(tc.outputDisplay).trim()
              ? "pass"
              : "fail";
        }
        return {
          ...tc,
          status,
          userOutput:
            typeof userOut === "string"
              ? userOut
              : userOut !== undefined
              ? JSON.stringify(userOut, null, 2)
              : "",
        };
      });
    }

    if (
      typeof attempt.passed_tests === "number" &&
      typeof attempt.total_tests === "number"
    ) {
      return uiTests.map((tc, idx) => ({
        ...tc,
        status: idx < attempt.passed_tests ? "pass" : "fail",
        userOutput: idx < attempt.passed_tests ? tc.outputDisplay : "(Test failed)",
      }));
    }

    return uiTests.map((tc) => ({
      ...tc,
      status: "pending",
      userOutput: "",
    }));
  }, [uiTests, attempt]);

  const lang = attempt?.language || attempt?.lang || "javascript";
  const filename = filenameByLang
    ? filenameByLang(lang)
    : `solution.${lang === "python" ? "py" : "js"}`;
  const code =
    attempt?.submitted_code ||
    attempt?.submittedCode ||
    attempt?.code ||
    "";
  const expectedFnName = question ? getFunctionName(question.title || "") : "";

  const summary = (() => {
    if (!attempt) return null;
    const passed =
      attempt.passed_tests ??
      testsWithVerdict.filter((t) => t.status === "pass").length;
    const total = attempt.total_tests ?? testsWithVerdict.length;
    return { passed, total };
  })();

  const formatObjectAsLines = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return formatScalarDisplay(obj);
    }
    return Object.entries(obj)
      .map(([k, v]) => `${k} = ${formatScalarDisplay(v)}`)
      .join("\n");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
        <TopNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-600">Loading attempt...</div>
        </main>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
        <TopNav />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "Attempt not found"}</p>
            <button
              onClick={() => navigate(-1)}
              className="text-[#4A53A7] hover:underline"
            >
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="text-[#4A53A7] hover:text-[#3b4287] font-medium flex items-center gap-2"
            >
              <span className="text-lg">←</span>
              Back
            </button>

            {summary && (
              <div className="text-sm">
                <span
                  className={
                    summary.passed === summary.total
                      ? "text-green-600 font-semibold"
                      : "text-gray-700"
                  }
                >
                  {summary.passed} / {summary.total} tests passed
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white p-6 shadow border border-gray-200 h-fit overflow-hidden">
              {question ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 mb-3 break-words">
                    {question.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {question.difficulty && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                          DIFF_COLOR[question.difficulty] || ""
                        }`}
                      >
                        {question.difficulty}
                      </span>
                    )}
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
                 <div
                className="text-gray-800 leading-relaxed prose prose-sm max-w-none
                            prose-pre:bg-transparent prose-pre:text-gray-800
                            prose-pre:border prose-pre:border-gray-300 prose-pre:rounded-lg
                            prose-code:text-gray-800"
                dangerouslySetInnerHTML={{ __html: question.description }}
                />
                </>
              ) : (
                <p className="text-gray-600">Question unavailable.</p>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {/* code */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-gray-700 text-sm font-medium">
                    Your submitted solution
                  </span>
                  <span className="text-xs text-gray-400">
                    {lang} • {filename}
                  </span>
                </div>
                <CodeEditor
                  readOnly
                  value={code}
                  onChange={() => {}}
                  language={lang}
                  expectedFnName={expectedFnName}
                  height="400px"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
