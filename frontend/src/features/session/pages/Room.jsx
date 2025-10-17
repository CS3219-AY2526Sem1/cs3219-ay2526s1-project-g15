import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import TopNav from "../../../shared/components/TopNav";
import ProblemPanel from "../components/ProblemPanel";
import CodeEditor from "../../../shared/components/CodeEditor";
import useCollaborationSocket from "../hooks/useCollaborationSocket";

export default function Room() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("user_id") || crypto.randomUUID();
  const username = searchParams.get("username") || "Guest";

  // TODO: change based on the question from backend
  const [code, setCode] = useState(`// Write your solution here
function hasCycle(head){
  
}
`);

  const [activeCase, setActiveCase] = useState(1);
  const [language, setLanguage] = useState("javascript");

  const { socketReady, sessionState, sendMessage } =
    useCollaborationSocket(sessionId, userId, username);

  // when we receive a session state from backend, update editor.
  // depend only on `sessionState` to satisfy react-hooks/exhaustive-deps.
  useEffect(() => {
    if (!sessionState) return;

    if (sessionState.code !== undefined) {
      setCode(prev => (prev !== sessionState.code ? sessionState.code : prev));
    }
    if (sessionState.language) {
      setLanguage(prev => (prev !== sessionState.language ? sessionState.language : prev));
    }
  }, [sessionState]);

  // when user types in editor, broadcast code updates (debounced)
  useEffect(() => {
    if (!socketReady) return;

    const debounce = setTimeout(() => {
      sendMessage("code_update", { code });
    }, 400);

    return () => clearTimeout(debounce);
  }, [code, socketReady, sendMessage]);

  // when user changes language, notify collaborators
  useEffect(() => {
    if (socketReady) {
      sendMessage("language_change", { language });
    }
  }, [language, socketReady, sendMessage]);

  // when user presses "Run" button to run code
  const runCode = (src, lang) => {
    alert(`Run pressed\nLanguage: ${lang}\n\n${src.slice(0, 80)}...`);
  };

  const filenameByLang = (lang) =>
    ({ javascript: "index.js", typescript: "index.ts", python: "main.py",
       java: "Main.java", cpp: "main.cpp", csharp: "Program.cs" }[lang] || "main.txt");

  return (
    <div className="min-h-screen bg-[#D7D6E6] flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[calc(100vh-56px-32px)]">
            <div className="lg:col-span-1">
              <ProblemPanel className="h-full" />
            </div>

            <section className="lg:col-span-2 rounded-2xl bg-white p-4 border shadow-inner flex flex-col">
              {/* connection status */}
              {!socketReady && (
                <p className="text-sm text-gray-500 mb-2">
                  Connecting to collaboration service...
                </p>
              )}
              {socketReady && (
                <p className="text-sm text-green-600 mb-2">
                  Connected as <b>{username}</b>
                </p>
              )}

              {/* code editor with its own header bar */}
              <CodeEditor
                filename={filenameByLang(language)}
                language={language}
                onLanguageChange={setLanguage}
                value={code}
                onChange={setCode}
                onRun={runCode}
                // TODO: avatar logic when presence is available
                avatarText="S"
              />

              {/* test cases (placeholder — replace with backend data) */}
              <div className="mt-4 rounded-xl bg-[#111827] text-gray-100 p-4">
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setActiveCase(n)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        activeCase === n ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"
                      }`}
                    >
                      Case {n}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-300 mb-1">Expected Output</div>
                    <input
                      readOnly
                      value="..."
                      className="w-full bg-gray-900 rounded-md px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-gray-300 mb-1">Actual Output</div>
                    <input
                      readOnly
                      value="..."
                      className="w-full bg-gray-900 rounded-md px-3 py-2 outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
