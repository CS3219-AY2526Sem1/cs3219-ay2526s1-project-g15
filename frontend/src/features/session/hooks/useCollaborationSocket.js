import { useEffect, useRef, useState } from "react";

export default function useCollaborationSocket(sessionId, userId, username) {
  const [socketReady, setSocketReady] = useState(false);
  const [sessionState, setSessionState] = useState({
    status: "preparing",
    code: "",
    notes: "",
    users: []
  });
  const [partnerLeft, setPartnerLeft] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    console.log("useCollaborationSocket effect running", sessionId, userId, username);
    if (!sessionId || !userId) return;

    const wsUrl = `/api/v1/ws/session/active/${sessionId}?user_id=${userId}&username=${username}`;
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
              status: message.data ? "ready" : "preparing"
            }));
            break;
        case "code_update":
            setSessionState(prev => ({
            ...prev,
            code: message.code,
            users: prev.users.map(u =>
                u.user_id === message.user_id
                ? { ...u, cursor: message.cursor }
                : u
            )
            }));
            break;
        case "notes_update":
            setSessionState(prev => ({
            ...prev,
            notes: message.notes
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
        case "partner_left":
          setSessionState((prev) => ({
            ...prev,
            users: prev.users.filter((u) => u.user_id !== message.user_id),
          }));
          setPartnerLeft(true);
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
      socketRef.current.send(JSON.stringify({ type, ...data }));
    }
  };

  return { socketReady, sessionState, sendMessage, partnerLeft };
}