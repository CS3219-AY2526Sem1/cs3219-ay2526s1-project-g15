import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

// hooks
import useUserDetails from "../../../shared/hooks/useUserDetails";
import useCollaborativeSession from "../hooks/useCollaborationSession";
import useCodeExecution from "../hooks/useCodeExecution";
import useSubmission from "../hooks/useSubmission";

// apis
import { getSessionDetails } from "../../../shared/api/matchingService";
import { questionService } from "../../../shared/api/questionService";

// components
import TopNav from "../../../shared/components/TopNav";
import ProblemPanel from "../components/ProblemPanel";
import {
  CodeEditor,
  SubmitBanner,
  TestCases,
  EndSessionModal,
  ConnectionStatus,
} from "../components/right_panel";

import { getFunctionName } from "../../../shared/utils/HarnessBuilders";
import { prettyPrintInput, prettyPrintOutput, parseRelaxed  } from "../../../shared/utils/ioFormat";
import { filenameByLang } from "../constants";

// some outputs have "" but others don't --> need helpers to compare outputs
function normalizeForCompare(val) {
  if (val === null || val === undefined) return "";

  // numbers / booleans
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }

  // arrays / objects → canonical JSON string
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  if (typeof val === "string") {
    let s = val.trim();

    // Try to JSON.parse
    try {
      const parsed = JSON.parse(s);

      // For primitives like strings, numbers
      if (
        typeof parsed === "string" ||
        typeof parsed === "number" ||
        typeof parsed === "boolean"
      ) {
        return String(parsed);
      }

      // For arrays/objects
      return JSON.stringify(parsed);
    } catch {
      // continue if not JSON
    }

    // Removes a single pair of outer quotes (some questions have outer quotes for expected output)
    s = s.replace(/^"(.*)"$/, "$1");
    return s.trim();
  }

  return String(val).trim();
}

function outputsMatch(expected, actual) {
  const normExpected = normalizeForCompare(expected);
  const normActual = normalizeForCompare(actual);
  return normExpected === normActual;
}


export default function Room() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const {
    user,
    userId,
    username,
  } = useUserDetails();

  const [activeCase, setActiveCase] = useState(1);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // actual question from backend
  const [question, setQuestion] = useState(null);
  const [questionLoading, setQuestionLoading] = useState(true);

  const [showSubmitSummary, setShowSubmitSummary] = useState(false);
  const [submitSummary, setSubmitSummary] = useState({ passed: 0, total: 0 });
  const [lastSubmittedCode, setLastSubmittedCode] = useState("");


  // collaborative session hook
  const {
    code,
    setCode,
    language,
    setLanguage,
    socketReady,
  } = useCollaborativeSession(sessionId, userId, username);

  const expectedFnName = useMemo(() => {
    if (!question || !question.title) return "";
    return getFunctionName(question.title);
  }, [question]);

  // 1) fetch question for this session so runner can use backend test_cases
  useEffect(() => {
    if (!sessionId) return;

    const fetchQuestionForSession = async () => {
      try {
        setQuestionLoading(true);

        // get session from matching service
        const sessionDetails = await getSessionDetails(sessionId);

        const questionId = sessionDetails?.question?.id;
        if (!questionId) {
          console.warn("No question id on session", sessionDetails);
          setQuestion(null);
          return;
        }

        // get actual question from question service
        const q = await questionService.getQuestion(questionId);
        setQuestion(q);
      } catch (err) {
        console.error("Error fetching question for session:", err);
        setQuestion(null);
      } finally {
        setQuestionLoading(false);
      }
    };

    fetchQuestionForSession();
  }, [sessionId]);


  const runnerQuestion = useMemo(() => {
    if (question) {
      return {
        title: question.title || "problem",
        topics: question.topics || [],
        test_cases: Array.isArray(question.test_cases) ? question.test_cases : [],
      };
    }
    // not loaded yet --> pass empty structure
    return {
      title: "loading",
      topics: [],
      test_cases: [],
    };
  }, [question]);

  // use new hook
  const { runCode, isRunning, actualOutput, caseOutputs } = useCodeExecution(runnerQuestion);

  // submission hook
  const { submitSolution, isSubmitting, submitBanner, setSubmitBanner } = useSubmission(
    sessionId,
    userId,
    username
  );

  const handleSubmit = async () => {
  if (!code.trim()) {
    alert("Please enter some code!");
    return;
  }

  //latest run results
  try {
    const maybe = runCode(code, language);
    if (maybe && typeof maybe.then === "function") {
      await maybe;
    }
  } catch (e) {
    console.warn("runCode before submit failed", e);
  }

  // compare against backend test cases
  let passed = 0;
  let total = 0;
  const details = [];

  if (question && Array.isArray(question.test_cases)) {
    total = question.test_cases.length;

    question.test_cases.forEach((tc, idx) => {
      // runner may index 0 or 1, so try both
      const runnerRes = caseOutputs[idx + 1] ?? caseOutputs[idx];

      // normalise user output coming from runner
      const userOut =
        runnerRes && typeof runnerRes === "object"
          ? (runnerRes.output ??
             runnerRes.actual ??
             runnerRes.result ??
             runnerRes)
          : runnerRes;

      // expected can be "output" or "outputDisplay"
      const expected = tc.output ?? tc.outputDisplay;

      const isCorrect =
        userOut !== undefined && outputsMatch(expected, userOut);

      if (isCorrect) passed += 1;

      details.push({
        id: idx + 1,
        input: tc.input,
        expected,
        userOut,
        isCorrect,
      });
    });
  }

  // update UI 
  setSubmitSummary({
    passed,
    total,
    details,
  });
  setLastSubmittedCode(code);
  setShowSubmitSummary(true);

  // payload for backend
  const payload = {
    sessionId,                 // from useParams()
    questionId: question?.id,  // from questionService
    userId,                  
    username,                 
    language,                  // current lang in editor
    code,                      // full code the user submitted
    expectedFnName,            // function name
    passedTestCases: passed,
    totalTestCases: total,
    testCaseResults: details.map(d => ({
      id: d.id,
      input: d.input,
      expected: d.expected,
      userOutput: d.userOut,
      isCorrect: d.isCorrect,
    })),
  };

  // TODO: send to backend via hook
  try {
    await submitSolution(payload);
  } catch (err) {
    console.warn("submitSolution failed:", err);
  }
};


  const handleEndSession = () => {
    setShowLeaveConfirm(true);
  };

  /**
   * UI-friendly tests
   */
  const uiTests = useMemo(() => {
  if (!question || !Array.isArray(question.test_cases)) return [];
  return question.test_cases.map((tc) => {
    // normalise input
    let parsedInput = tc.input;
    if (typeof tc.input === "string") {
      // try relaxed first
      const relaxed = parseRelaxed(tc.input);
      if (relaxed !== null) {
        parsedInput = relaxed;
      } else {
        // then strict JSON
        try {
          parsedInput = JSON.parse(tc.input);
        } catch {
          parsedInput = tc.input; // leave as string
        }
      }
    }

    // normalize output
    let outputDisplay;
    if (typeof tc.output === "string") {
      outputDisplay = tc.output;
    } else if (Array.isArray(tc.output) || typeof tc.output === "object") {
      outputDisplay = JSON.stringify(tc.output, null, 2);
    } else {
      outputDisplay = prettyPrintOutput(tc.output);
    }

    return {
      inputDisplay: prettyPrintInput(parsedInput),
      outputDisplay,
      explanation: tc.explanation || "",
      // keep original just in case
      input: parsedInput,
      output: tc.output,
    };
  });
}, [question]);

const testsWithVerdict = useMemo(() => {
  // uiTests is in the same order as backend test_cases
  return uiTests.map((tc, idx) => {
    const actualFromRunner = caseOutputs?.[idx + 1] ?? caseOutputs?.[idx];

    const userOut =
      actualFromRunner && typeof actualFromRunner === "object"
        ? 
          (actualFromRunner.output ?? actualFromRunner.actual ?? actualFromRunner.result ?? actualFromRunner)
        : actualFromRunner;

    // compare with original tc.output (not display), fall back to display
    const expectedForCompare =
      tc.output !== undefined ? tc.output : tc.outputDisplay;

    const isCorrect =
      userOut !== undefined
        ? outputsMatch(expectedForCompare, userOut)
        : false;

    return {
      ...tc,
      status: userOut === undefined ? "pending" : isCorrect ? "pass" : "fail",
      userOutput:
        userOut === undefined
          ? ""
          : typeof userOut === "string"
          ? userOut
          : JSON.stringify(userOut, null, 2),
    };
  });
}, [uiTests, caseOutputs]);


  return (
    <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[calc(100vh-56px-32px)]">
            {/* LEFT PANEL */}
            <div className="lg:col-span-1">
              {/* keep your existing ProblemPanel that fetches + renders HTML description */}
              <ProblemPanel sessionId={sessionId} className="h-full" />
            </div>

            {/* RIGHT PANEL */}
            <section className="lg:col-span-2 rounded-2xl bg-white p-4 border shadow-inner flex flex-col">
              {submitBanner && (
                <SubmitBanner message={submitBanner} onClose={() => setSubmitBanner("")} />
              )}

              <ConnectionStatus
                socketReady={socketReady}
                username={username}
                onLeave={handleEndSession}
              />

              {showLeaveConfirm && (
                <EndSessionModal
                  setShowLeaveConfirm={setShowLeaveConfirm}
                  navigate={navigate}
                />
              )}

              <CodeEditor
                filename={filenameByLang(language)}
                language={language}
                onLanguageChange={setLanguage}
                value={code}
                onChange={setCode}
                onRun={() => runCode(code, language)}
                onSubmit={handleSubmit}
                expectedFnName={expectedFnName}
                isRunning={isRunning}
              />

              <TestCases
                tests={testsWithVerdict}
                activeCase={activeCase}
                setActiveCase={setActiveCase}
                caseOutputs={caseOutputs}
                loading={questionLoading}
              />

              {showSubmitSummary && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Submission Summary
                  </h2>
                  <p className="text-sm text-gray-700 mb-4">
                    You passed{" "}
                    <span className="font-bold text-green-600">
                      {submitSummary.passed}
                    </span>{" "}
                    out of{" "}
                    <span className="font-semibold">{submitSummary.total}</span>{" "}
                    test cases.
                  </p>

                  {/* Summary table */}
                  <div className="max-h-48 overflow-y-auto mb-4 border border-gray-200 rounded-md">
                    <table className="w-full text-sm text-left font-mono">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-3 py-1">#</th>
                          <th className="px-3 py-1">Result</th>
                          <th className="px-3 py-1">Input</th>
                          <th className="px-3 py-1">Expected</th>
                          <th className="px-3 py-1">Your Output</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submitSummary.details.map((tc) => (
                          <tr
                            key={tc.id}
                            className={`${
                              tc.isCorrect ? "bg-green-50" : "bg-red-50"
                            } border-b border-gray-200`}
                          >
                            <td className="px-3 py-1">{tc.id}</td>
                            <td className="px-3 py-1 font-semibold">
                              {tc.isCorrect ? (
                                <span className="text-green-600">✓ Passed</span>
                              ) : (
                                <span className="text-red-600">✗ Failed</span>
                              )}
                            </td>
                            <td className="px-3 py-1 truncate max-w-[120px]">
                              {String(tc.input)}
                            </td>
                            <td className="px-3 py-1 truncate max-w-[120px]">
                              {String(tc.expected)}
                            </td>
                            <td className="px-3 py-1 truncate max-w-[120px]">
                              {String(tc.userOut)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Show user's full submitted code */}
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-800 mb-1">
                      Your Submitted Solution
                    </div>
                    <textarea
                      readOnly
                      value={lastSubmittedCode}
                      className="w-full h-40 bg-gray-100 rounded-md p-2 font-mono text-xs text-gray-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSubmitSummary(false)}
                      className="px-4 py-2 rounded-md text-sm bg-gray-200 hover:bg-gray-300 text-gray-800"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubmitSummary(false);
                        setShowLeaveConfirm(true);
                      }}
                      className="px-4 py-2 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white"
                    >
                      Leave Session
                    </button>
                  </div>
                </div>
              </div>
            )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
