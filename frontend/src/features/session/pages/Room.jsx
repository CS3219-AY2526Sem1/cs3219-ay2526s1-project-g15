import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import TopNav from "../../../shared/components/TopNav";
import ProblemPanel from "../components/ProblemPanel";
import CodeEditor from "../../../shared/components/CodeEditor";
import useCollaborationSocket from "../hooks/useCollaborationSocket";
import { buildHarness } from "../../../shared/utils/HarnessBuilders";

// language mapping for Piston API
const LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
};

// mock question:
// ---- MOCK QUESTION: 141. Linked List Cycle ----
const PROBLEM_SPEC = {
  fn: { name: "hasCycle", params: ["head"] },
  // Represent linked list inputs as a small JSON schema; pos is cycle entry index or -1
  tests: [
    { args: [{ kind: "ll", arr: [3,2,0,-4], pos: 1 }], expected: true },
    { args: [{ kind: "ll", arr: [1,2], pos: 0 }], expected: true },
    { args: [{ kind: "ll", arr: [1], pos: -1 }], expected: false },
  ],
  // per-language helper code to build/deserialize inputs
  preludes: {
    javascript: `
class ListNode {
  constructor(val){ this.val = val; this.next = null; }
}
function buildLinkedList(arr, pos){
  if(!arr.length) return null;
  const nodes = arr.map(v=>new ListNode(v));
  for(let i=0;i<nodes.length-1;i++) nodes[i].next = nodes[i+1];
  if(pos>=0) nodes[nodes.length-1].next = nodes[pos];
  return nodes[0];
}
function deserializeArg(arg){
  if (arg && arg.kind === "ll") return buildLinkedList(arg.arr, arg.pos);
  return arg;
}
    `,
    typescript: `
class ListNode {
  val: number; next: ListNode | null;
  constructor(val:number){ this.val = val; this.next = null; }
}
function buildLinkedList(arr:number[], pos:number): ListNode | null {
  if(!arr.length) return null;
  const nodes = arr.map(v=>new ListNode(v));
  for(let i=0;i<nodes.length-1;i++) nodes[i].next = nodes[i+1];
  if(pos>=0) nodes[nodes.length-1]!.next = nodes[pos]!;
  return nodes[0]!;
}
function deserializeArg(arg:any): any {
  if (arg && arg.kind === "ll") return buildLinkedList(arg.arr, arg.pos);
  return arg;
}
    `,
    python: `
class ListNode:
    def __init__(self, x):
        self.val = x
        self.next = None

def buildLinkedList(arr, pos):
    if not arr: return None
    nodes = [ListNode(v) for v in arr]
    for i in range(len(nodes)-1):
        nodes[i].next = nodes[i+1]
    if pos >= 0:
        nodes[-1].next = nodes[pos]
    return nodes[0]

def deserialize_arg(arg):
    if isinstance(arg, dict) and arg.get("kind") == "ll":
        return buildLinkedList(arg["arr"], arg["pos"])
    return arg
    `,
    // NOTE (Java): require users to implement `class Solution { public boolean hasCycle(ListNode head) { ... } }`
    java: `
import java.util.*;

class ListNode {
  int val; ListNode next;
  ListNode(int x){ val = x; next = null; }
}
class Builders {
  static ListNode buildLinkedList(int[] arr, int pos){
    if(arr.length==0) return null;
    ListNode[] nodes = new ListNode[arr.length];
    for(int i=0;i<arr.length;i++) nodes[i] = new ListNode(arr[i]);
    for(int i=0;i<arr.length-1;i++) nodes[i].next = nodes[i+1];
    if(pos>=0) nodes[arr.length-1].next = nodes[pos];
    return nodes[0];
  }
}
    `,
  }
};


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

    // for user to toggle between the different test case buttons
  const [activeCase, setActiveCase] = useState(1);
  
  // for user to toggle between different languages
  const [language, setLanguage] = useState("javascript");
  
  // for correct output
  const [actualOutput, setActualOutput] = useState("");
  
  // for UI
  const [isRunning, setIsRunning] = useState(false);
  
  // for user's outputs
  const [caseOutputs, setCaseOutputs] = useState({});


  const { socketReady, sessionState, sendMessage } =
    useCollaborationSocket(sessionId, userId, username);

  // when we receive a session state from backend, update editor.
  useEffect(() => {
    if (!sessionState) return;

    if (sessionState.code !== undefined) {
      setCode(prev => (prev !== sessionState.code ? sessionState.code : prev));
    }
    if (sessionState.language) {
      setLanguage(prev => (prev !== sessionState.language ? sessionState.language : prev));
    }
  }, [sessionState]);

  // when user types in editor, broadcast code updates
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

  // when user presses "Run" button to run code, pass the source code(src) and language (lang) to API
  const runCode = async (src, lang) => {
    // update UI
    setIsRunning(true);
    setActualOutput("Running...");

    try {
      const langConfig = LANGUAGE_MAP[lang];
      if (!langConfig) {
        setActualOutput(`Error: ${lang} is not supported`);
        return;
      }

      // Build leetCode-style harness around the user's code
      const codeWithHarness = buildHarness(src, lang, PROBLEM_SPEC);

      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: langConfig.language,
          version: langConfig.version,
          files: [{ name: filenameByLang(lang), content: codeWithHarness }],
          stdin: "",
          compile_timeout: 10000,
          run_timeout: 3000,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();

      if (result.compile && result.compile.code !== 0) {
        setActualOutput(`Compilation Error:\n${result.compile.stderr || result.compile.output}`);
        return;
      }
      if (result.run.code !== 0 && result.run.stderr) {
        setActualOutput(`Runtime Error:\n${result.run.stderr}`);
        return;
      }

      const raw = (result.run.output || result.run.stdout || "").trim();
      const map = parseHarnessOutput(raw);
      // split and display by test case
      setCaseOutputs(map); 
      setActualOutput(raw || "(no output)");
    } catch (err) {
      setActualOutput(`Execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // divide the output of HarnessBuilder to separate into the different test cases
  // output structure: {"case":0,"out":true}
    function parseHarnessOutput(raw) {
    const lines = (raw || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    const parsed = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        // ignore non-JSON lines (e.g., blank logs)
      }
    }
    // detect if cases are 0-based; if any 0 found, we’ll display as 1-based
    const hasZero = parsed.some(r => typeof r.case === "number" && r.case === 0);

    const outByCase = {};
    for (const r of parsed) {
      if (typeof r.case !== "number") continue;
      const uiCase = hasZero ? r.case + 1 : r.case; // normalize to match button labels
      // show user output if present; otherwise show error (optional)
      const val =
        r.hasOwnProperty("out")
          ? (typeof r.out === "object" ? JSON.stringify(r.out) : String(r.out))
          : (r.error ? String(r.error) : "");
      outByCase[uiCase] = val;
    }

    return outByCase;
  }


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

              {/* test cases */}
              <div className="mt-4 rounded-xl bg-[#111827] text-gray-100 p-4">
                <div className="flex gap-2 mb-3">
                {Array.from({ length: PROBLEM_SPEC.tests.length }, (_, i) => i + 1).map((n) => (
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
                    <textarea
                      readOnly
                      value={(caseOutputs[activeCase] ?? "...")}
                      className="w-full bg-gray-900 rounded-md px-3 py-2 outline-none resize-none font-mono text-xs"
                      rows="3"
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