import { useState } from "react";
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

// TODO: figure out logic for avatar icon (needs to appear only when the person is online, and needs to be different colours and alphabet for different people)
export default function CodeEditor({
  value,
  onChange,
  language = "javascript",
  onLanguageChange,
  languages = ["javascript", "typescript", "python", "java"],
  filename = "index.js",
  height = "520px",
  onRun,            
  avatarSrc,
  avatarText = "S",
}) {
  const [running, setRunning] = useState(false);

  // TODO: check if code is correct when user runs the code
  const handleRun = async () => {
    if (!onRun || running) return;
    try {
      const maybePromise = onRun(value, language);
      if (maybePromise && typeof maybePromise.then === "function") {
        setRunning(true);
        await maybePromise;
      }
    } finally {
      setRunning(false);
    }
  };

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

        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            aria-label="Run (Ctrl/⌘ + Enter)"
            title="Run (Ctrl/⌘ + Enter)"
            className="group inline-flex h-7 w-7 items-center justify-center rounded-full
                       border border-gray-600 bg-gray-700 hover:bg-emerald-600
                       disabled:opacity-60"
          >
            {running ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-white" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="4"/>
                <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="4"/>
              </svg>
            ) : (
                // play icon to run code
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-300 group-hover:text-white" fill="currentColor">
                <path d="M8 5v14l11-7-11-7z" />
              </svg>
            )}
          </button>

          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="you"
              className="h-6 w-6 rounded-full object-cover ring-2 ring-[#1a192b]"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-[#5a5989] text-white grid place-items-center text-xs ring-2 ring-[#5a5989]">
              {avatarText}
            </div>
          )}
        </div>
      </div>

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
