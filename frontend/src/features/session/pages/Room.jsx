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

        // step 1: get session (matching service)
        const sessionDetails = await getSessionDetails(sessionId);

        const questionId = sessionDetails?.question?.id;
        if (!questionId) {
          console.warn("No question id on session", sessionDetails);
          setQuestion(null);
          return;
        }

        // step 2: get actual question from question service
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

  /**
   * 2) Build the object we pass to your UPDATED useCodeExecution(question)
   * Your hook + harness requires `question.test_cases`
   * If backend doesn't send it, we still pass an object with an empty array
   * so the hook can show a nice message.
   */
  const runnerQuestion = useMemo(() => {
    if (question) {
      return {
        title: question.title || "problem",
        topics: question.topics || [],
        test_cases: Array.isArray(question.test_cases) ? question.test_cases : [],
      };
    }
    // not loaded yet → pass empty structure
    return {
      title: "loading",
      topics: [],
      test_cases: [],
    };
  }, [question]);

  // 3) use your new hook
  const { runCode, isRunning, actualOutput, caseOutputs } = useCodeExecution(runnerQuestion);

  // submission hook
  const { submitSolution, isSubmitting, submitBanner, setSubmitBanner } = useSubmission(
    sessionId,
    userId,
    username
  );

  const handleSubmit = async () => {
    if (!code.trim()) return alert("Please enter some code!");
    await submitSolution(code, language);
  };

  const handleEndSession = () => {
    setShowLeaveConfirm(true);
  };

  /**
   * 4) UI-friendly tests for the right panel
   * backend shape (from your README):
   * test_cases: [{ "input": {...}, "output": [...] }]
   * we show them as strings
   */
  const uiTests = useMemo(() => {
  if (!question || !Array.isArray(question.test_cases)) return [];
  return question.test_cases.map((tc) => {
    // normalize input
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
      // keep original too, just in case
      input: parsedInput,
      output: tc.output,
    };
  });
}, [question]);


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
                tests={uiTests}
                activeCase={activeCase}
                setActiveCase={setActiveCase}
                caseOutputs={caseOutputs}
                loading={questionLoading}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
