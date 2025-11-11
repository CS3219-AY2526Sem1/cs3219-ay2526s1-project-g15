import { useEffect, useRef, useState } from "react";

export default function useCollaborationSocket(sessionId, userId, username) {
  const [socketReady, setSocketReady] = useState(false);
  const [sessionState, setSessionState] = useState({
    status: "preparing",
    code: "",
    notes: "",
    users: [],
    chatMessages: [],
    lineLocks: {},
  });
  const socketRef = useRef(null);

  useEffect(() => {
    console.log("useCollaborationSocket effect running", sessionId, userId, username);
    if (!sessionId || !userId) return;

    const wsUrl = `ws://localhost:8004/api/v1/ws/session/active/${sessionId}?user_id=${userId}&username=${username}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Connected to WebSocket");
      setSocketReady(true);
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "session_state":
            setSessionState(prev => ({
              ...prev,
              status: message.data ? "ready" : "preparing",
              code: message.data.code || "",
              chatMessages: message.data.chat || [],
              users: message.data.users || [],
            }));
            break;
        case "line_update": {
            console.log("Received line update:", message);
            const { user_id, line_number, content } = message;
            setSessionState(prev => {
              const model = Array.isArray(prev.code) ? [...prev.code] : prev.code.split("\n");

              // Extend array if needed
              while (model.length < line_number) model.push("");

              // Update the specific line (Monaco lines are 1-indexed)
              model[line_number - 1] = content;

              return {
                ...prev,
                code: model, // always array
                users: prev.users.map(u =>
                  u.user_id === user_id ? { ...u, cursor: u.cursor } : u
                ),
              };
            });
            break;
        }
        case "line_lock_update":
            setSessionState((prev) => ({
              ...prev,
              lineLocks: message.locks || {},
            }));
            break;
        case "line_lock_denied": {
            const { line_number, locked_by } = message;
            console.warn(`Line ${line_number} is locked by ${locked_by}`);
            // optionally: show UI feedback, disable editing for this line
            break;
        }
        case "chat_message":
            setSessionState(prev => ({
              ...prev,
              chatMessages: [...(prev.chatMessages || []), message],
            }));
            break;
        case "language_change":
            // TO DO: handle language change if needed
            break;
        case "user_joined":
            setSessionState(prev => ({
            ...prev,
            users: [...prev.users, { user_id: message.user_id, username: message.username, cursor: null }]
            }));
            break;
        case "user_left":
            setSessionState(prev => ({
            ...prev,
            users: prev.users.filter(u => u.user_id !== message.user_id)
            }));
            break;
        default:
            console.warn("Unhandled message:", message);
        }

    };

    socket.onclose = () => {
      console.log("WebSocket closed");
      setSocketReady(false);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    return () => {
      socket.close();
    };
  }, [sessionId, userId, username]);

  // Helper to send JSON messages
  const sendMessage = (type, data = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log("Sending message:", type, data);
      socketRef.current.send(JSON.stringify({ type, ...data }));
    }
  };

  const requestLineLock = (line) =>
    sendMessage("request_line_lock", { line_number: line, action: "lock" });

  const releaseLineLock = (line) =>
    sendMessage("request_line_lock", { line_number: line, action: "unlock" });

  return { socketReady, sessionState, sendMessage, requestLineLock, releaseLineLock };
}