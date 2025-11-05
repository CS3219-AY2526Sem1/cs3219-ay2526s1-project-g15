import { useState } from "react";
import { buildHarness } from "../../../shared/utils/HarnessBuilders";
import { LANGUAGE_MAP, filenameByLang } from "../constants";

export default function useCodeExecution(question) {
  const [isRunning, setIsRunning] = useState(false);
  const [caseOutputs, setCaseOutputs] = useState({});
  const [actualOutput, setActualOutput] = useState("");

  const parseHarnessOutput = (raw) => {
    const lines = (raw || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const parsed = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        // ignore non-JSON lines
      }
    }

    const hasZero = parsed.some((r) => typeof r.case === "number" && r.case === 0);
    const byCase = {};
    for (const r of parsed) {
      if (typeof r.case !== "number") continue;
      const uiCase = hasZero ? r.case + 1 : r.case;
      const val =
        r.hasOwnProperty("out")
          ? typeof r.out === "object"
            ? JSON.stringify(r.out)
            : String(r.out)
          : r.error
          ? String(r.error)
          : "";
      byCase[uiCase] = val;
    }
    return byCase;
  };

  const runCode = async (src, lang) => {
    // 1) validate question + tests
    if (!question || !Array.isArray(question.test_cases) || question.test_cases.length === 0) {
      const msg = "Error: Invalid question format - missing test cases";
      setActualOutput(msg);
      setCaseOutputs({ 1: msg });
      return;
    }

    setIsRunning(true);
    setActualOutput("Running...");
    setCaseOutputs({});

    try {
      // 2) language check
      const langConfig = LANGUAGE_MAP[lang];
      if (!langConfig) {
        const msg = `Error: ${lang} not supported`;
        setActualOutput(msg);
        setCaseOutputs({ 1: msg });
        return;
      }

      // 3) build harness (this can throw)
      const codeWithHarness = buildHarness(src, lang, question);

      // 4) call Piston
      const resp = await fetch("https://emkc.org/api/v2/piston/execute", {
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

      if (!resp.ok) {
        const msg = `HTTP error: ${resp.status}`;
        setActualOutput(msg);
        setCaseOutputs({ 1: msg });
        return;
      }

      const result = await resp.json();
      // console.log("PISTON RESULT:", result); // ← keep this while debugging

      // 5) compile stage (defensive)
      const compile = result.compile ?? result.compiled ?? null;
      if (compile && typeof compile.code === "number" && compile.code !== 0) {
        const msg = `Compilation Error:\n${compile.stderr || compile.output || ""}`;
        setActualOutput(msg);
        setCaseOutputs({ 1: msg });
        return;
      }

      // 6) run stage (defensive)
      const run = result.run ?? result.ran ?? null;
      if (!run) {
        // some responses can be "just stdout" or something weird
        const msg = `Execution Error:\n${JSON.stringify(result, null, 2)}`;
        setActualOutput(msg);
        setCaseOutputs({ 1: msg });
        return;
      }

      // if run.code != 0, it’s an error — but only read stderr if it exists
      if (typeof run.code === "number" && run.code !== 0) {
        const msg = `Runtime Error:\n${run.stderr || run.stdout || run.output || ""}`;
        setActualOutput(msg);
        setCaseOutputs({ 1: msg });
        return;
      }

      // 7) success path
      const raw = (run.output || run.stdout || "").trim();
      const map = parseHarnessOutput(raw);

      if (Object.keys(map).length === 0) {
        // maybe user just printed stuff
        const msg = raw || "(no output)";
        setActualOutput(msg);
        setCaseOutputs({ 1: msg });
      } else {
        setActualOutput(raw || "(no output)");
        setCaseOutputs(map);
      }
    } catch (err) {
      const msg = `Execution failed: ${err.message}`;
      setActualOutput(msg);
      setCaseOutputs({ 1: msg });
    } finally {
      setIsRunning(false);
    }
  };

  return {
    runCode,
    isRunning,
    actualOutput,
    caseOutputs,
  };
}
