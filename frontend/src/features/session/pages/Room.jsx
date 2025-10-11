import { useState } from "react";
import TopNav from "../../../shared/components/TopNav";
import ProblemPanel from "../components/ProblemPanel";
import CodeEditor from "../../../shared/components/CodeEditor";

export default function Room() {
  {/* TODO: change based on the question in backend */}
  const [code, setCode] = useState(`// Write your solution here
function hasCycle(head){
  
}
`);

  const [activeCase, setActiveCase] = useState(1);
  const [language, setLanguage] = useState("javascript");
  
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
              {/* Code editor with its own header bar */}
              <CodeEditor
                filename={filenameByLang(language)}
                language={language}
                onLanguageChange={setLanguage}
                value={code}
                onChange={setCode}
                onRun={runCode}
                // TODO: figure out logic for avatar icon (needs to appear only when the person is online, and needs to be different colours and alphabet for different people)
                avatarText="S"               
              />

              {/* test cases */}
              {/* TODO: change based on the question in backend */}
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
