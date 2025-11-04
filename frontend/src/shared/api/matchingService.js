const BASE_URL = "/api/v1/matching";

/**
 * Create a match request
 * @param {Object} data - { difficulty, topic }
 * @param {string} token - JWT access token
 */
export async function createMatchRequest(data, token) {
  const res = await fetch(`${BASE_URL}/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { id, user_id, topic, difficulty, status, ... }
}

/**
 * Get the status of a match request
 * @param {string} requestId
 * @param {string} token
 */
export async function getMatchRequestStatus(requestId, token) {
  const res = await fetch(`${BASE_URL}/requests/${requestId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { status: "MATCHED" | "PENDING", match_id? }
}

/**
 * Cancel a match request
 * @param {string} requestId
 * @param {string} token
 */
export async function cancelMatchRequest(requestId, token) {
  const res = await fetch(`${BASE_URL}/request/${requestId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { message: "Match request cancelled" }
}

/**
 * Confirm or cancel a match
 * @param {Object} data - { match_id, confirmed: true | false }
 * @param {string} token
 */
export async function confirmMatch(data, token) {
  const res = await fetch(`${BASE_URL}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
  // if confirmed: { match_id, session_id, question_id, partner_id }
  // if cancelled: { status: "cancelled", requeued_partner, match_id }
}

/**
 * Get the status of a match
 * @param {string} matchId
 * @param {string} token - JWT access token
 * @returns {Promise<{confirm_status: boolean, session_id: string | "Not created"}>}
 */
export async function getMatchStatus(matchId, token) {
  const res = await fetch(`${BASE_URL}/${matchId}/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error(await res.text());

  return res.json();
  // Example response:
  // { confirm_status: true, session_id: "e5aa6c95-f06b-46aa-991a-ea98c624d825" }
}


/**
 * Get collaboration session details by session_id
 * @param {string} sessionId
 * @param {string} token - JWT access token
 */
export async function getSessionDetails(sessionId, token) {
  const res = await fetch(`${BASE_URL}/session/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Open WebSocket connection for real-time updates
 * @param {string} token - JWT access token
 * @param {(msg: any) => void} onMessage - callback for messages
 * @returns {WebSocket} - the socket instance
 */
export function connectMatchingWebSocket(token, onMessage) {
  // Nginx proxy handles /api/v1/matching/ws
  const socketUrl = `${window.location.origin.replace(/^http/, "ws")}${BASE_URL}/ws?token=${token}`;
  const ws = new WebSocket(socketUrl);

  ws.onopen = () => console.log("[MatchingWS] connected");
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage?.(data);
    } catch (err) {
      console.error("[MatchingWS] invalid message", err);
    }
  };
  ws.onclose = () => console.log("[MatchingWS] closed");
  ws.onerror = (err) => console.error("[MatchingWS] error", err);

  return ws;
}

