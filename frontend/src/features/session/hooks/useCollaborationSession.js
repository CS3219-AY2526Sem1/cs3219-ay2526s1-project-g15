import { useState, useEffect, useRef } from "react";
import useCollaborationSocket from "./useCollaborationSocket";

export default function useCollaborativeSession(sessionId, userId, username) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

  // Tracks if we're currently typing to avoid overwriting our own changes
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const lastSentCodeRef = useRef("");
  const pendingUpdateRef = useRef(null);

  const { socketReady, sessionState, sendMessage, partnerLeft } =
    useCollaborationSocket(sessionId, userId, username);

  // Update editor from incoming sessionState
  useEffect(() => {
    if (!sessionState) return;

    // Only update code if we're not actively typing
    if (sessionState.code !== undefined && sessionState.code !== lastSentCodeRef.current) {
      if (isTypingRef.current) {
        pendingUpdateRef.current = sessionState.code;
      } else {
        setCode(sessionState.code);
        lastSentCodeRef.current = sessionState.code;
      }
    }
  }, [sessionState]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);

    isTypingRef.current = true;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;

      if (pendingUpdateRef.current && pendingUpdateRef.current !== newCode) {
        setCode(pendingUpdateRef.current);
        lastSentCodeRef.current = pendingUpdateRef.current;
        pendingUpdateRef.current = null;
      }
    }, 500);
  };

  // Broadcast code updates
  useEffect(() => {
    if (!socketReady) return;
    if (code === lastSentCodeRef.current) return;

    const debounce = setTimeout(() => {
      sendMessage("code_update", { code });
      lastSentCodeRef.current = code;
    }, 150);

    return () => clearTimeout(debounce);
  }, [code, socketReady, sendMessage]);

  // Broadcast language changes
  useEffect(() => {
    if (socketReady) {
      sendMessage("language_change", { language });
    }
  }, [language, socketReady, sendMessage]);

  const sendChatMessage = (text) => {
    if (!text.trim() || !socketReady) return;
    // Broadcast chat_message to both clients
    sendMessage("chat_message", { text });
  };

  return {
    code,
    setCode: handleCodeChange,
    language,
    setLanguage,
    chatMessages: sessionState.chatMessages || [],
    sendChatMessage,
    socketReady,
    sessionState,
    partnerLeft,
  };
}
