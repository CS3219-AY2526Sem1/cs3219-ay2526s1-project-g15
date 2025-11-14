import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Hook imports
import useMatchmaking from "../hooks/useMatchmaking";

// Component imports
import TopNav from "../../../shared/components/TopNav";
import OngoingMeetingCard from "../components/OngoingMeetingCard";
import {
  ConfirmMatch,
  FindingMatch,
  NoMatchFound,
  QuestionSelection,
  PreparingSession,
  WaitingForPartner,
  ConfirmTimeout,
} from "../components/right_panel";

import useCollaborationSocket from "../../session/hooks/useCollaborationSocket";

export default function Home() {
  const navigate = useNavigate();

  const [rejoinSession, setRejoinSession] = useState(null);

  const {
    status,
    setStatus,
    topic,
    setTopic,
    difficulty,
    setDifficulty,
    topics,
    completedTopics,
    hasOngoingMeeting,
    setHasOngoingMeeting,
    disableStart,
    startSearch,
    cancelSearch,
    confirmMatch,
    retry,
    sessionId,
    username,
    userId,
    topicDifficultyMatrix,
  } = useMatchmaking();

  // connect WebSocket once preparing
  const { socketReady, sessionState } = useCollaborationSocket(
    status === "preparing_session" ? sessionId : sessionId,
    userId,
    username
  );

  // auto-navigate once session is ready
  useEffect(() => {
    if (sessionState === "ready") {
      navigate(`/session/active/${sessionId}`);
    }
  }, [sessionState, navigate, sessionId]);

  useEffect(() => {
    const fetchOngoing = async () => {
      // 1) try backend first
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          // not logged in
          setRejoinSession(null);
          setHasOngoingMeeting(false);
        } else {
          const res = await fetch("/api/v1/matching/sessions/active", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          console.log("rejoin: status", res.status);

          if (res.status === 200) {
            const data = await res.json();
            setRejoinSession(data);
            setHasOngoingMeeting(true);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load ongoing session from backend", err);
      }

      // 2) fallback: check localStorage
      const localSessionId = localStorage.getItem("active_session_id");
      if (localSessionId) {
        setRejoinSession({ session_id: localSessionId });
        setHasOngoingMeeting(true);
      } else {
        setRejoinSession(null);
        setHasOngoingMeeting(false);
      }
    };

    if (userId) {
      fetchOngoing();
    }
  }, [userId, setHasOngoingMeeting]);

  const handleRejoin = () => {
    if (!rejoinSession) return;
    navigate(`/session/active/${rejoinSession.session_id}`);
  };

  return (
    <div className="min-h-screen bg-[#D7D6E6]">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex gap-6">
          {hasOngoingMeeting && (
            <OngoingMeetingCard onRejoin={handleRejoin} />
          )}

          <section className="flex-1 rounded-2xl bg-white p-8 shadow border border-gray-200">
            {status === "idle" && (
              <QuestionSelection
                topic={topic}
                setTopic={setTopic}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                topics={topics}
                completedTopics={completedTopics}
                disableStart={disableStart|| hasOngoingMeeting}
                startSearch={startSearch} 
                topicDifficultyMatrix={topicDifficultyMatrix} 
              />
            )}

            {/* spinner */}
            {status === "searching" && (
              <FindingMatch cancelSearch={cancelSearch} />
            )}

            {/* Match is found */}
            {status === "found" && (
              <ConfirmMatch confirmMatch={confirmMatch} cancelSearch={cancelSearch} setStatus={setStatus} />
            )}

            {/* No match found */}
            {status === "no_match" && (
              <NoMatchFound retry={retry} />
            )}

            {/* Preparing session */}
            {status === "waiting_for_partner" && (
              <WaitingForPartner />
            )}

            {/* Preparing session */}
            {status === "confirm_timeout" && (
              <ConfirmTimeout retry={retry} />
            )}

            {/* Preparing session */}
            {status === "preparing_session" && (
              <PreparingSession
                sessionId={sessionId}
                userId={userId}
                username={username}
                onReady={() => navigate(`/session/active/${sessionId}`)}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
