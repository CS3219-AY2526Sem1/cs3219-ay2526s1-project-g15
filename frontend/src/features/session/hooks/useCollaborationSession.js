import { useState, useEffect } from "react";
import useCollaborationSocket from "./useCollaborationSocket";

export default function useCollaborativeSession(sessionId, userId, username) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [chatMessages, setChatMessages] = useState([]);

  const { socketReady, sessionState, sendMessage } =
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

    if (sessionState.chat) {
      setChatMessages(sessionState.chat);
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

  const sendChatMessage = (text) => {
    if (!text.trim() || !socketReady) return;
    console.log("Sending chat message:", text);
    sendMessage("chat_message", { text });
    setChatMessages((prev) => [
      ...prev,
      { user: username, text, timestamp: new Date().toISOString() },
    ]);
    console.log("Chat messages:", chatMessages);
  };

  return {
    code,
    setCode,
    language,
    setLanguage,
    chatMessages,
    sendChatMessage,
    socketReady,
    sessionState,
  };
}
