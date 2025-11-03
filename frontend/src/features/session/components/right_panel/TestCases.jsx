export default function TestCases({
  tests = [],
  activeCase,
  setActiveCase,
  caseOutputs = {},
  loading = false,
}) {
  const total = Array.isArray(tests) ? tests.length : 0;
  const current = total > 0 ? tests[activeCase - 1] : null;

  const rawActual = caseOutputs[activeCase];
  const actualDisplay =
    typeof rawActual === "string"
      ? rawActual
      : rawActual == null
      ? "..."
      : (() => {
          try { return JSON.stringify(rawActual, null, 2); } catch { return String(rawActual); }
        })();

  return (
    <div className="mt-4 rounded-xl bg-[#111827] text-gray-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-300 font-medium">Test Cases</span>
        {loading && <span className="text-xs text-gray-400">loading from backend…</span>}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {total > 0 ? (
          Array.from({ length: total }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setActiveCase(n)}
              className={`px-3 py-1 rounded-md text-sm ${
                activeCase === n ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              Case {n}
            </button>
          ))
        ) : (
          <span className="text-xs text-gray-400">No test cases available</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Expected */}
        <div>
          <div className="text-gray-300 mb-1">Expected Output</div>
          <textarea
            readOnly
            value={current ? current.outputDisplay ?? "" : "..."}
            className="w-full bg-gray-900 rounded-md px-3 py-2 outline-none resize-none font-mono text-xs"
            rows="3"
          />
        </div>

        {/* Actual */}
        <div>
          <div className="text-gray-300 mb-1">Actual Output</div>
          <textarea
            readOnly
            value={actualDisplay}
            className="w-full bg-gray-900 rounded-md px-3 py-2 outline-none resize-none font-mono text-xs"
            rows="3"
          />
        </div>
      </div>

      {current && (
        <div className="mt-4">
          <div className="text-gray-300 mb-1">Input</div>
          <textarea
            readOnly
            value={current.inputDisplay ?? ""}
            className="w-full bg-gray-900 rounded-md px-3 py-2 outline-none resize-none font-mono text-xs"
            rows="3"
          />
        </div>
      )}

      {current?.explanation && (
        <div className="mt-2 text-xs text-gray-300">
          {current.explanation}
        </div>
      )}
    </div>
  );
}
