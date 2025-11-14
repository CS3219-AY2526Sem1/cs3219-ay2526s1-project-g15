import { useEffect, useRef, useState } from "react";

export default function useCollaborationSocket(sessionId, userId, username) {
  const [socketReady, setSocketReady] = useState(false);
  const [sessionState, setSessionState] = useState({
    status: "preparing",
    code: "",
    notes: "",
    users: [],          
    chatMessages: [],   
  });
  const [partnerLeft, setPartnerLeft] = useState(false);
  const socketRef = useRef(null);

  const usersByIdRef = useRef(new Map());

  const upsertUser = (id, name) => {
    if (!id) return;
    const existing = usersByIdRef.current.get(id);
    usersByIdRef.current.set(id, name || existing || "Someone");
  };

  const nameOf = (id, fallback) => {
    return usersByIdRef.current.get(id) || fallback || "Someone";
  };

  const normalizeUsers = (arr) =>
    (arr || [])
      .filter(Boolean)
      .map((u) => ({
        user_id: u.user_id,
        username: u.username || nameOf(u.user_id, "Someone"),
      }));

  // Diff previous -> next users to generate joined/left system messages
  const withPresenceDiff = (prevState, nextUsers) => {
    const prevUsers = prevState.users || [];
    const prevMap = new Map(prevUsers.map((u) => [u.user_id, u.username]));
    const nextMap = new Map(nextUsers.map((u) => [u.user_id, u.username]));

    const prevIds = new Set(prevMap.keys());
    const nextIds = new Set(nextMap.keys());

    const joinedIds = [...nextIds].filter((id) => !prevIds.has(id));
    const leftIds   = [...prevIds].filter((id) => !nextIds.has(id));

    // Seed ref-map with names before composing messages
    nextUsers.forEach((u) => upsertUser(u.user_id, u.username));
    // keep previous names in ref-map so we can know who leaves
    prevUsers.forEach((u) => upsertUser(u.user_id, u.username));

    const systemLines = [];

    // Announce the other user that joined
    joinedIds.forEach((id) => {
      if (id === userId) return; // don't announce own presence
      const nm = nameOf(id, nextMap.get(id) || "Someone");
      systemLines.push({ type: "system", username: "system", text: `${nm} joined the session`, timestamp: new Date().toISOString() });
    });

    // Announce leaves
    leftIds.forEach((id) => {
      if (id === userId) return; // ignore our own disconnects
      const nm = nameOf(id, prevMap.get(id) || "Someone");
      systemLines.push({ type: "system", username: "system", text: `${nm} left the session`, timestamp: new Date().toISOString() });
    });

    return {
      ...prevState,
      users: nextUsers,
      chatMessages: systemLines.length
        ? [...(prevState.chatMessages || []), ...systemLines]
        : prevState.chatMessages,
    };
  };

  useEffect(() => {
    if (!sessionId || !userId) return;

    const wsUrl = `/api/v1/ws/session/active/${encodeURIComponent(
      sessionId
    )}?user_id=${encodeURIComponent(userId)}&username=${encodeURIComponent(username || "")}`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setSocketReady(true);
      safeSend({ type: "introduce", user_id: userId, username });
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "session_state": {
          const incomingUsers = normalizeUsers(msg.data?.users || []);
          setSessionState((prev) => withPresenceDiff(
            { ...prev, status: msg.data ? "ready" : "preparing", code: msg.data?.code || "", chatMessages: msg.data?.chat || prev.chatMessages },
            incomingUsers
          ));
          break;
        }

        case "presence_snapshot": {
          const incomingUsers = normalizeUsers(msg.users || []);
          setSessionState((prev) => withPresenceDiff(prev, incomingUsers));
          break;
        }
        case "introduce": {
          const { user_id, username: u } = msg;
          upsertUser(user_id, u);
          setSessionState((prev) => {
            const current = normalizeUsers(prev.users);
            const has = current.some((x) => x.user_id === user_id);
            const next = has
              ? current.map((x) => (x.user_id === user_id ? { ...x, username: nameOf(user_id, u) } : x))
              : [...current, { user_id, username: nameOf(user_id, u) }];
            return withPresenceDiff(prev, next);
          });
          break;
        }

        case "user_joined": {
          const { user_id, username: u } = msg;
          upsertUser(user_id, u);
          setSessionState((prev) => {
            const current = normalizeUsers(prev.users);
            const withoutDup = current.filter((x) => x.user_id !== user_id);
            const next = [...withoutDup, { user_id, username: nameOf(user_id, u) }];
            return withPresenceDiff(prev, next);
          });
          break;
        }

        case "user_left":
        case "partner_left": {
          const { user_id, username: u } = msg;
          // Keep the last known name before removal
          upsertUser(user_id, u);
          if (msg.type === "partner_left") setPartnerLeft(true);

          setSessionState((prev) => {
            const current = normalizeUsers(prev.users);
            const next = current.filter((x) => x.user_id !== user_id);
            return withPresenceDiff(prev, next);
          });
          break;
        }

        case "chat_message": {
          // Normalize username from user_id if missing
          const resolvedName = msg.username || nameOf(msg.user_id, "Someone");
          setSessionState((prev) => ({
            ...prev,
            chatMessages: [...(prev.chatMessages || []), { ...msg, username: resolvedName }],
          }));
          break;
        }

        case "code_update": {
          setSessionState((prev) => ({ ...prev, code: msg.code }));
          break;
        }
        default:
          console.warn("Unhandled message type:", msg.type);
      }
    };
    socket.onclose = () => setSocketReady(false);
    socket.onerror = (err) => console.error("WebSocket error", err);

    return () => socket.close();
  }, [sessionId, userId, username]);

  const safeSend = (obj) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(obj));
    }
  };

  const sendMessage = (type, data = {}) => safeSend({ type, ...data });

  return { socketReady, sessionState, sendMessage, partnerLeft };
}
