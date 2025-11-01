import { useState } from "react";
import { buildHarness } from "../../../shared/utils/HarnessBuilders";
import { LANGUAGE_MAP, filenameByLang } from "../constants";

export default function useCodeExecution(problemSpec) {
  const [isRunning, setIsRunning] = useState(false);
  const [caseOutputs, setCaseOutputs] = useState({});
  const [actualOutput, setActualOutput] = useState("");

  const parseHarnessOutput = (raw) => {
    const lines = (raw || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const parsed = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        // ignore non-JSON lines
      }
    }
    const hasZero = parsed.some(r => typeof r.case === "number" && r.case === 0);
    const outByCase = {};
    for (const r of parsed) {
      if (typeof r.case !== "number") continue;
      const uiCase = hasZero ? r.case + 1 : r.case;
      const val =
        r.hasOwnProperty("out")
          ? (typeof r.out === "object" ? JSON.stringify(r.out) : String(r.out))
          : (r.error ? String(r.error) : "");
      outByCase[uiCase] = val;
    }
    return outByCase;
  };

  const runCode = async (src, lang) => {
    setIsRunning(true);
    setActualOutput("Running...");
    try {
      const langConfig = LANGUAGE_MAP[lang];
      if (!langConfig) {
        setActualOutput(`Error: ${lang} not supported`);
        return;
      }

      const codeWithHarness = buildHarness(src, lang, problemSpec);
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

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const result = await response.json();

      if (result.compile?.code !== 0) {
        setActualOutput(`Compilation Error:\n${result.compile.stderr || result.compile.output}`);
        return;
      }
      if (result.run.code !== 0 && result.run.stderr) {
        setActualOutput(`Runtime Error:\n${result.run.stderr}`);
        return;
      }

      const raw = (result.run.output || result.run.stdout || "").trim();
      const map = parseHarnessOutput(raw);
      setCaseOutputs(map);
      setActualOutput(raw || "(no output)");
    } catch (err) {
      setActualOutput(`Execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return { runCode, isRunning, actualOutput, caseOutputs };
}
