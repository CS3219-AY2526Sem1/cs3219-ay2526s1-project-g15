import { useEffect} from "react";
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
  WaitingForPartner
} from "../components/right_panel";

import useCollaborationSocket from "../../session/hooks/useCollaborationSocket";

export default function Home() {
  const navigate = useNavigate();

  const {
    status,
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

  return (
    <div className="min-h-screen bg-[#D7D6E6]">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex gap-6">
          {hasOngoingMeeting && <OngoingMeetingCard onRejoin={() => alert("Rejoining meeting...")} />}

          <section className="flex-1 rounded-2xl bg-white p-8 shadow border border-gray-200">
            {status === "idle" && (
              <QuestionSelection 
                topic={topic}
                setTopic={setTopic}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                topics={topics}
                completedTopics={completedTopics}
                disableStart={disableStart}
                startSearch={startSearch} 
                topicDifficultyMatrix={topicDifficultyMatrix} 
              />
            )}

            {/* spinner */}
            {status === "searching" && (
              <FindingMatch cancelSearch={cancelSearch}/>
            )}

            {/* Match is found */}
            {status === "found" && (
              <ConfirmMatch confirmMatch={confirmMatch} cancelSearch={cancelSearch} />
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


        {/* TODO: remove this once logic for whether or not there is an ongoing meeting is up */}
        <div className="mt-6 text-sm text-gray-600">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasOngoingMeeting}
              onChange={(e) => setHasOngoingMeeting(e.target.checked)}
            />
            Show “ongoing meeting” sidebar
          </label>
        </div>
      </main>
    </div>
  );
}
