import { useState, useEffect, useRef } from "react";
import useCollaborationSocket from "./useCollaborationSocket";

export default function useCollaborativeSession(sessionId, userId, username) {
  const [codeLines, setCodeLines] = useState([]);
  const [language, setLanguage] = useState("javascript");
  const [chatMessages, setChatMessages] = useState([]);
  const [lineLocks, setLineLocks] = useState({});

  const { socketReady, sessionState, sendMessage, requestLineLock, releaseLineLock } =
    useCollaborationSocket(sessionId, userId, username);

  // update editor from incoming sessionState
  useEffect(() => {
    if (!sessionState) return;

    if (sessionState.code !== undefined) {
      setCodeLines((prevLines) => {
        const newLines = Array.isArray(sessionState.code)
        ? sessionState.code
        : sessionState.code.split("\n");

        // only replace if different
        if (prevLines.join("\n") !== newLines.join("\n")) return newLines;
        return prevLines;
      });
    }
    if (sessionState.language) {
      setLanguage((prev) =>
        prev !== sessionState.language ? sessionState.language : prev
      );
    }

    if (sessionState.chat) {
      setChatMessages(sessionState.chat);
    }

    if (sessionState.lineLocks) {
      setLineLocks(sessionState.lineLocks);
    }
  }, [sessionState]);

  // broadcast code updates (debounced)
  /*
  useEffect(() => {
    if (!socketReady) return;
    const debounce = setTimeout(() => {
      sendMessage("code_update", { code });
    }, 1000);
    return () => clearTimeout(debounce);
  }, [code, socketReady, sendMessage]);
  */

  // broadcast language changes
  /*
  useEffect(() => {
    if (socketReady) {
      sendMessage("language_change", { language });
    }
  }, [language, socketReady, sendMessage]); */

  const updateLine = (newContent, lineNumber) => {
    console.log(lineNumber, newContent)
    setCodeLines((prevLines) => {
      const updated = [...prevLines];
      updated[lineNumber - 1] = newContent; // Monaco lines are 1-based
      console.log(updated)
      return updated;
    });

    console.log("Sending line update:", lineNumber, newContent);
    sendMessage("line_update", {
      line_number: lineNumber,
      content: newContent,
    })   ;
  };

  const sendChatMessage = (text) => {
    console.log("socket", socketReady);
    if (!text.trim() || !socketReady) return;
    console.log("Sending chat message:", text);
    sendMessage("chat_message", { text });
    setChatMessages((prev) => [
      ...prev,
      { user: username, text, timestamp: new Date().toISOString() },
    ]);
    console.log("Chat messages:", chatMessages);
  };

  const requestLock = (line) => requestLineLock(line);
  const releaseLock = (line) => releaseLineLock(line);

  return {
    codeLines,
    setCodeLines,
    code: codeLines.join("\n"),
    updateLine,
    language,
    setLanguage,
    chatMessages,
    sendChatMessage,
    socketReady,
    sessionState,
    userId,
    lineLocks,
    requestLock,
    releaseLock,
    sendMessage
  };
}
