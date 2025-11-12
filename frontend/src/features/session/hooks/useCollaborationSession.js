import { useState, useEffect, useRef } from "react";
import useCollaborationSocket from "./useCollaborationSocket";

export default function useCollaborativeSession(sessionId, userId, username) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [chatMessages, setChatMessages] = useState([]);
  
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
      // If we're typing, delay the update
      if (isTypingRef.current) {
        pendingUpdateRef.current = sessionState.code;
      } else {
        setCode(sessionState.code);
        lastSentCodeRef.current = sessionState.code;
      }
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

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    
    // Mark as typing
    isTypingRef.current = true;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing to false after user stops typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      
      // Apply any pending updates after we stop typing
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
    
    // Skip if code hasn't changed from what we last sent
    if (code === lastSentCodeRef.current) return;
    
    const debounce = setTimeout(() => {
      sendMessage("code_update", { code });
      lastSentCodeRef.current = code;
    }, 150); // 150ms for better responsiveness
    
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
    console.log("Sending chat message:", text);
    sendMessage("chat_message", { text });
    setChatMessages((prev) => [
      ...prev,
      { user: username, text, timestamp: new Date().toISOString() },
    ]);
  };

  return {
    code,
    setCode: handleCodeChange, // Use the wrapped version
    language,
    setLanguage,
    chatMessages,
    sendChatMessage,
    socketReady,
    sessionState,
    partnerLeft,
  };
}