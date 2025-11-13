import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

// hooks
import useUserDetails from "../../../shared/hooks/useUserDetails";
import useCollaborativeSession from "../hooks/useCollaborationSession";
import useCodeExecution from "../hooks/useCodeExecution";
import useSubmission from "../hooks/useSubmission";

// apis
import { getSessionDetails, leaveSession } from "../../../shared/api/matchingService";
import { questionService } from "../../../shared/api/questionService";

// components
import TopNav from "../../../shared/components/TopNav";
import ProblemPanel from "../components/ProblemPanel";
import ChatPanel from "../components/ChatPanel";
import {
  CodeEditor,
  SubmitBanner,
  TestCases,
  EndSessionModal,
  ConnectionStatus,
  SubmissionSummary,
} from "../components/code_panel";

import { getFunctionName } from "../../../shared/utils/HarnessBuilders";
import { prettyPrintInput, prettyPrintOutput, parseRelaxed } from "../../../shared/utils/ioFormat";
import { filenameByLang } from "../constants";

// some outputs have "" but others don't --> need helpers to compare outputs
function normalizeForCompare(val) {
  if (val === null || val === undefined) return "";

  // for numbers/booleans
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }

  // arrays/objects 
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  if (typeof val === "string") {
    let s = val.trim();

    // try to JSON.parse
    try {
      const parsed = JSON.parse(s);

      // for primitives like strings, numbers
      if (
        typeof parsed === "string" ||
        typeof parsed === "number" ||
        typeof parsed === "boolean"
      ) {
        return String(parsed);
      }

      // for arrays/objects
      return JSON.stringify(parsed);
    } catch {
      // continue if not JSON
    }

    // removes a single pair of outer quotes (some questions have outer quotes for expected output)
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

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem("active_session_id", sessionId);
    }
  }, [sessionId]);

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
    chatMessages,
    sendChatMessage,
    socketReady,
    partnerLeft,
    sessionState
  } = useCollaborativeSession(sessionId, userId, username);

  const expectedFnName = useMemo(() => {
    if (!question || !question.title) return "";
    return getFunctionName(question.title);
  }, [question]);

  // fetch question for this session so runner can use backend test_cases
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

    // run latest code first
    try {
      const maybe = runCode(code, language);
      if (maybe && typeof maybe.then === "function") {
        await maybe;
      }
    } catch (e) {
      console.warn("runCode before submit failed", e);
    }
    let passed = 0;
    let total = 0;
    const details = [];

    if (question && Array.isArray(question.test_cases)) {
      total = question.test_cases.length;

      question.test_cases.forEach((tc, idx) => {
        const runnerRes = caseOutputs[idx + 1] ?? caseOutputs[idx];

        const userOut =
          runnerRes && typeof runnerRes === "object"
            ? (runnerRes.output ??
              runnerRes.actual ??
              runnerRes.result ??
              runnerRes)
            : runnerRes;

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

    // build payload for backend
    const payload = {
      sessionId,
      questionId: question?.id,
      userId,
      username,
      language,
      code,
      expectedFnName,
      passedTestCases: passed,
      totalTestCases: total,
      testCaseResults: details.map((d) => ({
        id: d.id,
        input: d.input,
        expected: d.expected,
        userOutput: d.userOut,
        isCorrect: d.isCorrect,
      })),
    };

    try {
      await submitSolution(payload);

      // only if backend succeeds, show the summary
      setSubmitSummary({
        passed,
        total,
        details,
      });
      setLastSubmittedCode(code);
      setShowSubmitSummary(true);
      console.log(showSubmitSummary);
    } catch (err) {
      console.warn("submitSolution failed:", err);
      return;
    }
  };



  const handleEndSession = () => {
    setShowLeaveConfirm(true);
  };

  const handleEndSessionConfirm = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await leaveSession(sessionId, token)
    } catch (err) {
      console.error("Failed to end session:", err);
      // even if it fails, we still navigate away
    }
    localStorage.removeItem("active_session_id");

    // go back home
    navigate("/home");
  };

  /**
   * UI-friendly tests
   */
// AI Assistance Disclosure:
// Tool: ChatGPT (model: GPT‑5 Thinking), date: 2025-10-29
// Scope: Asked ChatGPT about the implementation approach for this function
// Author review: I validated correctness, and edited it such that it works for our project.
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
      <main className="flex flex-1">
        <div className="mx-4 my-4 w-full">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* LEFT PANEL */}
            <div className="resize overflow-auto lg:w-1/3">
              {/* keep your existing ProblemPanel that fetches + renders HTML description */}
              <ProblemPanel sessionId={sessionId} className="h-full" />
            </div>

            {/* CENTER PANEL */}
            <div className="resize overflow-auto lg:w-1/3 rounded-2xl bg-white p-4 border shadow-inner flex flex-col">
              {submitBanner && (
                <SubmitBanner message={submitBanner} onClose={() => setSubmitBanner("")} />
              )}

              <ConnectionStatus
                socketReady={socketReady}
                username={username}
                partnerLeft={partnerLeft}
                onLeave={handleEndSession}
              />

              {showLeaveConfirm && (
                <EndSessionModal
                  setShowLeaveConfirm={setShowLeaveConfirm}
                  onConfirm={handleEndSessionConfirm}
                  onCancel={() => setShowLeaveConfirm(false)}
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

              {showSubmitSummary &&(
                <SubmissionSummary
                  setShowLeaveConfirm={setShowLeaveConfirm}
                  setShowSubmitSummary={setShowSubmitSummary}
                  submitSummary={submitSummary}
                  lastSubmittedCode={lastSubmittedCode}
                />
              )}
            </div>
            <div className="resize-y lg:w-1/3 rounded-2xl bg-white p-4 border shadow-inner flex flex-col h-[calc(100vh-100px)]" >
              <ChatPanel 
                chatMessages={sessionState.chatMessages || []}
                sendChatMessage={sendChatMessage}
                username={username}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
