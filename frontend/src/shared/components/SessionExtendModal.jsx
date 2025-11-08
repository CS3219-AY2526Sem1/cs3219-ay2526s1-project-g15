export default function SessionExtendModal({ open, secondsLeft, onContinue, onLogout }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Continue your session?</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your session will expire in <span className="font-semibold">{secondsLeft}s</span>.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onLogout} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Log out</button>
          <button onClick={onContinue} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Continue</button>
        </div>
      </div>
    </div>
  );
}
