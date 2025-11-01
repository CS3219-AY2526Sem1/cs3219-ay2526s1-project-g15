import { useEffect } from "react";
import useCollaborationSocket from "../../../session/hooks/useCollaborationSocket";

export default function SessionLoading({ sessionId, userId, username, onReady }) {
  const { socketReady, sessionState } = useCollaborationSocket(sessionId, userId, username);
  console.log("SessionLoading - socketReady:", socketReady, "sessionState:", sessionState);

  useEffect(() => {
    if (sessionState?.status === "ready") {
      onReady(); // Home can handle navigation
    }
  }, [sessionState, onReady]);

  return (
    <div className="h-[420px] flex flex-col items-center justify-center gap-6">
      <h2 className="text-xl font-bold">Preparing your session...</h2>
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full border-8 border-gray-200/70" />
        <div className="absolute inset-0 rounded-full border-8 border-[#4A53A7] border-t-transparent border-r-transparent animate-spin" />
      </div>
      <p className="text-gray-600 mt-4">Connecting you as <b>{username}</b>...</p>
    </div>
  );
}
