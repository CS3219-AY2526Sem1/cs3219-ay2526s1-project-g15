export default function TestCases({ PROBLEM_SPEC, activeCase, setActiveCase, caseOutputs }) {
    return (
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
    );
}