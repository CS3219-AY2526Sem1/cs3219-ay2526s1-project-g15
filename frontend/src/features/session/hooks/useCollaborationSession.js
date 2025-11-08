import { useState, useEffect } from "react";
import useCollaborationSocket from "./useCollaborationSocket";

export default function useCollaborativeSession(sessionId, userId, username) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

  const { socketReady, sessionState, sendMessage, sessionEnded } =
    useCollaborationSocket(sessionId, userId, username);

  // update editor from incoming sessionState
  useEffect(() => {
    if (!sessionState) return;

    if (sessionState.code !== undefined) {
      setCode((prev) => (prev !== sessionState.code ? sessionState.code : prev));
    }
    if (sessionState.language) {
      setLanguage((prev) =>
        prev !== sessionState.language ? sessionState.language : prev
      );
    }
  }, [sessionState]);

  // broadcast code updates (debounced)
  useEffect(() => {
    if (!socketReady) return;
    const debounce = setTimeout(() => {
      sendMessage("code_update", { code });
    }, 400);
    return () => clearTimeout(debounce);
  }, [code, socketReady, sendMessage]);

  // broadcast language changes
  useEffect(() => {
    if (socketReady) {
      sendMessage("language_change", { language });
    }
  }, [language, socketReady, sendMessage]);

  return {
    code,
    setCode,
    language,
    setLanguage,
    socketReady,
    sessionState,
    sessionEnded,
  };
}
