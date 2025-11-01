import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PROBLEM_SPEC, filenameByLang } from "../constants";

// hooks
import useUserDetails from "../../../shared/hooks/useUserDetails";
import useCollaborativeSession from "../hooks/useCollaborationSession";
import useCodeExecution from "../hooks/useCodeExecution";
import useSubmission from "../hooks/useSubmission";

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


export default function Room() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const {
    user,
    userId,
    username,
    loading,
    error
  } = useUserDetails();

  const [activeCase, setActiveCase] = useState(1);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // collaborative session hook
  const {
    code,
    setCode,
    language,
    setLanguage,
    socketReady,
  } = useCollaborativeSession(sessionId, userId, username);

  // code execution hook
  const { runCode, isRunning, actualOutput, caseOutputs } = useCodeExecution(PROBLEM_SPEC);

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

  // handle end session
  const handleEndSession = () => {
    setShowLeaveConfirm(true);
  };

  return (
    <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[calc(100vh-56px-32px)]">
            <div className="lg:col-span-1">
              <ProblemPanel sessionId={sessionId} className="h-full" />
            </div>

            <section className="lg:col-span-2 rounded-2xl bg-white p-4 border shadow-inner flex flex-col">
              {submitBanner && (
                <SubmitBanner message={submitBanner} onClose={() => setSubmitBanner("")} />
              )}

              <ConnectionStatus socketReady={socketReady} username={username} onLeave={handleEndSession} />

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
                onRun={runCode}
                onSubmit={handleSubmit}  
                // TODO: avatar logic 
                avatarText="S"
              />

              <TestCases
                PROBLEM_SPEC={PROBLEM_SPEC}
                activeCase={activeCase}
                setActiveCase={setActiveCase}
                caseOutputs={caseOutputs}
              />
              
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}