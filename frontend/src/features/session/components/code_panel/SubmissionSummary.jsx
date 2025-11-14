export default function SubmissionSummary({
    setShowLeaveConfirm,
    setShowSubmitSummary,
    submitSummary,
    lastSubmittedCode, 
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Submission Summary
                </h2>
                <p className="text-sm text-gray-700 mb-4">
                    You passed{" "}
                <span className="font-bold text-green-600">
                    {submitSummary.passed}
                </span>{" "}
                    out of{" "}
                <span className="font-semibold">{submitSummary.total}</span>{" "}
                    test cases.
                </p>

                {/* Summary table */}
                <div className="max-h-48 overflow-y-auto mb-4 border border-gray-200 rounded-md">
                <table className="w-full text-sm text-left font-mono">
                    <thead className="bg-gray-100 text-gray-700">
                    <tr>
                        <th className="px-3 py-1">#</th>
                        <th className="px-3 py-1">Result</th>
                        <th className="px-3 py-1">Input</th>
                        <th className="px-3 py-1">Expected</th>
                        <th className="px-3 py-1">Your Output</th>
                    </tr>
                    </thead>
                    <tbody>
                    {submitSummary.details.map((tc) => (
                        <tr
                        key={tc.id}
                        className={`${
                            tc.isCorrect ? "bg-green-50" : "bg-red-50"
                        } border-b border-gray-200`}
                        >
                        <td className="px-3 py-1">{tc.id}</td>
                        <td className="px-3 py-1 font-semibold">
                            {tc.isCorrect ? (
                            <span className="text-green-600">✓ Passed</span>
                            ) : (
                            <span className="text-red-600">✗ Failed</span>
                            )}
                        </td>
                        <td className="px-3 py-1 truncate max-w-[120px]">
                            {String(tc.input)}
                        </td>
                        <td className="px-3 py-1 truncate max-w-[120px]">
                            {String(tc.expected)}
                        </td>
                        <td className="px-3 py-1 truncate max-w-[120px]">
                            {String(tc.userOut)}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>

                {/* Show user's full submitted code */}
                <div className="mb-4">
                <div className="text-sm font-medium text-gray-800 mb-1">
                    Your Submitted Solution
                </div>
                <textarea
                    readOnly
                    value={lastSubmittedCode}
                    className="w-full h-40 bg-gray-100 rounded-md p-2 font-mono text-xs text-gray-900"
                />
                </div>

                <div className="flex justify-end gap-2">
                {/* <button
                    type="button"
                    onClick={() => setShowSubmitSummary(false)}
                    className="px-4 py-2 rounded-md text-sm bg-gray-200 hover:bg-gray-300 text-gray-800"
                >
                    Close
                </button> */}
                <button
                    type="button"
                    onClick={() => {
                        setShowSubmitSummary(false)
                        setShowLeaveConfirm(true)
                    }}
                    className="px-4 py-2 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white"
                >
                    Leave Session
                </button>
                </div>
            </div>
        </div>
    );
}