export default function RoomHeader({ socketReady, username, onLeave }) {
  return (
    <div className="relative mb-2">
      {!socketReady ? (
        <p className="text-sm text-gray-500 mb-8">Connecting to collaboration service...</p>
      ) : (
        <p className="text-sm text-green-600 mb-8">
          Connected as <b>{username}</b>
        </p>
      )}
      <button
        onClick={onLeave}
        className="absolute right-4 top-0 px-3 py-1 rounded-md text-sm font-medium text-white bg-red-700 hover:bg-red-800 transition"
      >
        End Session
      </button>
    </div>
  );
}
