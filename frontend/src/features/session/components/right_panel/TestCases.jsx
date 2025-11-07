export default function TestCases({
  tests = [],
  activeCase,
  setActiveCase,
  caseOutputs = {},
  loading = false,
}) {
  const total = Array.isArray(tests) ? tests.length : 0;
  const current = total > 0 ? tests[activeCase - 1] : null;

  // actual output from runner
  // prefer the test's own userOutput 
  const rawActualFromTest = current?.userOutput;
  const rawActualFromRunner = caseOutputs[activeCase];
  const rawActual =
    rawActualFromTest !== undefined && rawActualFromTest !== ""
      ? rawActualFromTest
      : rawActualFromRunner;

  const actualDisplay =
    typeof rawActual === "string"
      ? rawActual
      : rawActual == null
      ? "..."
      : (() => {
          try {
            return JSON.stringify(rawActual, null, 2);
          } catch {
            return String(rawActual);
          }
        })();

  // helper: always return a string
  const toDisplay = (val) => {
    if (typeof val === "string") return val;
    if (val == null) return "";
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  return (
    <div className="mt-4 rounded-xl bg-[#111827] text-gray-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-300 font-medium">Test Cases</span>
        {loading && <span className="text-xs text-gray-400">loading from backend…</span>}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {total > 0 ? (
          Array.from({ length: total }, (_, i) => i + 1).map((n) => {
            const test = tests[n - 1];
            const status = test?.status || "pending";

            let bg = "bg-gray-800 hover:bg-gray-700";
            if (status === "pass") bg = "bg-green-700 hover:bg-green-600";
            if (status === "fail") bg = "bg-red-700 hover:bg-red-600";

            return (
              <button
                key={n}
                onClick={() => setActiveCase(n)}
                className={`px-3 py-1 rounded-md text-sm transition ${
                  activeCase === n ? "ring-2 ring-offset-2 ring-indigo-400 ring-offset-[#111827]" : ""
                } ${bg}`}
              >
                Case {n}
              </button>
            );
          })
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
            value={current ? toDisplay(current.outputDisplay ?? current.output) : "..."}
            className="w-full bg-gray-900 rounded-md px-3 py-2 outline-none resize-none font-mono text-xs"
            rows="3"
          />
        </div>

        {/* Actual */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-gray-300">Actual Output</div>
            {current?.status === "pass" && (
              <span className="text-xs text-green-400 font-semibold">Passed</span>
            )}
            {current?.status === "fail" && (
              <span className="text-xs text-red-400 font-semibold">Failed</span>
            )}
            {(!current || current?.status === "pending") && (
              <span className="text-xs text-gray-400">Not run</span>
            )}
          </div>
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
            value={toDisplay(current.inputDisplay ?? current.input)}
            className="w-full bg-gray-900 rounded-md px-3 py-2 outline-none resize-none font-mono text-xs"
            rows="3"
          />
        </div>
      )}

      {current?.explanation && (
        <div className="mt-2 text-xs text-gray-300">{current.explanation}</div>
      )}
    </div>
  );
}
