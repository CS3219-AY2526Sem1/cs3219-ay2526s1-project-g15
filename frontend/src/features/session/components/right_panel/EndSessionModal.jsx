export default function EndSessionModal({ setShowLeaveConfirm, onConfirm }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Are you sure you want to end the session?
                </h3>
                <div className="flex justify-center gap-3">
                    <button
                        onClick={async () => {
                            if (onConfirm) {
                                await onConfirm();
                            }
                            // close modal
                            setShowLeaveConfirm(false);
                        }}
                        className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800"
                    >
                        Yes, End
                    </button>
                    <button
                        onClick={() => setShowLeaveConfirm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}