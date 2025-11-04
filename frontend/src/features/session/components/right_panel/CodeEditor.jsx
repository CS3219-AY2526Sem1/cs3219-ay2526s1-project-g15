import { useState, useCallback, useEffect, useMemo } from "react";
import Editor from "@monaco-editor/react";

const LABELS = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
};

function langBadge(lang) {
  return (lang?.slice(0, 2) || "js").toUpperCase();
}

// small utility: build a display signature from name + lang
function buildSignature(name, lang) {
  if (!name) return "";
  switch (lang) {
    case "python":
      return `def ${name}(...):`;
    case "typescript":
      return `function ${name}(...args: any[]): any {}`;
    case "javascript":
      return `function ${name}(...args) {}`;
    case "java":
      return `public static Object ${name}(/* params */) {}`;
    default:
      return name;
  }
}

export default function CodeEditor({
  value,
  onChange,
  language = "javascript",
  onLanguageChange,
  languages = ["javascript", "typescript", "python", "java"],
  filename = "index.js",
  height = "520px",
  onRun,
  onSubmit,
  expectedFnName = "",      
  isRunning = false,        // you already pass it
}) {
  const [localRunning, setLocalRunning] = useState(false);
  const [localSubmitting, setLocalSubmitting] = useState(false);

  // define the flags you’re using below
  const isRunningNow = isRunning || localRunning;
  const isSubmittingNow = localSubmitting;
  const busy = isRunningNow || isSubmittingNow;

  const handleRun = useCallback(async () => {
    if (!onRun || busy) return;
    const maybe = onRun(value, language);
    if (maybe && typeof maybe.then === "function") {
      setLocalRunning(true);
      try {
        await maybe;
      } finally {
        setLocalRunning(false);
      }
    }
  }, [onRun, value, language, busy]);

  const handleSubmit = useCallback(async () => {
    if (!onSubmit || busy) return;
    const maybe = onSubmit(value, language);
    if (maybe && typeof maybe.then === "function") {
      setLocalSubmitting(true);
      try {
        await maybe;
      } finally {
        setLocalSubmitting(false);
      }
    }
  }, [onSubmit, value, language, busy]);

  // keyboard shortcut: Ctrl/Cmd + Enter to Run
  useEffect(() => {
    const onKey = (e) => {
      const meta = navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey;
      if (meta && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRun]);

  const displaySignature = useMemo(
    () => buildSignature(expectedFnName, language),
    [expectedFnName, language]
  );

  return (
    <div className="rounded-2xl border border-gray-300 overflow-hidden">
      {/* Header */}
      <div className="bg-[#1f2937] text-gray-200 px-3 py-2 flex items-center justify-between gap-3">
        {/* left: badge + filename */}
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-[10px] font-bold">
            {langBadge(language)}
          </span>
          <span className="text-sm">{filename}</span>
        </div>

        {/* select language */}
        <div className="flex-1 flex justify-center">
          <select
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value)}
            className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 outline-none hover:bg-gray-650 focus:ring-1 focus:ring-gray-500"
          >
            {languages.map((id) => (
              <option key={id} value={id}>
                {LABELS[id] ?? id}
              </option>
            ))}
          </select>
        </div>

        {/* actions */}
        <div className="inline-flex items-center gap-2">
          {/* Run */}
          <button
            type="button"
            onClick={handleRun}
            disabled={busy}
            aria-label="Run (Ctrl/⌘ + Enter)"
            title="Run (Ctrl/⌘ + Enter)"
            className="group inline-flex h-7 w-7 items-center justify-center rounded-full
                       border border-gray-600 bg-gray-700 hover:bg-emerald-600
                       disabled:opacity-60"
          >
            {isRunningNow ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-white" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" />
                <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-300 group-hover:text-white" fill="currentColor">
                <path d="M8 5v14l11-7-11-7z" />
              </svg>
            )}
          </button>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!onSubmit || busy}
            className="px-3 py-1 rounded-md text-xs bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
            title="Submit your solution"
          >
            {isSubmittingNow ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      {/* 👇 NEW: function signature hint */}
      {displaySignature && (
        <div className="bg-[#111827] text-gray-200 text-xs px-3 py-1 border-t border-gray-700 font-mono">
          Implement: <span className="text-emerald-200">{displaySignature}</span>
        </div>
      )}

      <Editor
        height={height}
        theme="vs-dark"
        language={language}
        value={value}
        onChange={(v) => onChange?.(v ?? "")}
        options={{
          padding: { top: 16, bottom: 16 },
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          smoothScrolling: true,
        }}
      />
    </div>
  );
}
