import { useState, useRef, useEffect, useMemo, use } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../../../shared/components/TopNav";
import OngoingMeetingCard from "../components/OngoingMeetingCard";
import DifficultyPicker from "../components/DifficultyPicker";
import TopicSelect from "../components/TopicSelect";
import SessionLoading from "../components/SessionLoading";
import useCollaborationSocket from "../../session/hooks/useCollaborationSocket";
import { me } from "../../auth/api";
import { createMatchRequest, getMatchRequestStatus, cancelMatchRequest, confirmMatch as confirmMatchApi } from "../../../shared/api/matchingService";

const COMPLETED_TOPICS = ["Arrays", "Graphs"];

export default function Home() {
  // toggle to demo the sidebar
  const [hasOngoingMeeting, setHasOngoingMeeting] = useState(true);
  const [difficulty, setDifficulty] = useState("Medium");
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("Guest");
  const token = localStorage.getItem("accessToken");
  const [reqId, setReqId] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [questionId, setQuestionId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    me()
      .then((user) => {
        setUserId(user.id);
        setUsername(user.name || "Guest");
      })
      .catch(console.error);
  }, []);

  // TODO: fetch from backend
  const topics = useMemo(
    () => ["Array", "String", "Linked Lists", "Trees", "Graphs", "Dynamic Programming", "Math"],
    []
  );
  const completedTopics = COMPLETED_TOPICS;

  const firstAvailableTopic = useMemo(
    () => topics.find((t) => !completedTopics.includes(t)) || "",
    [topics, completedTopics]
  );

  // pick the first available topic by default
  const [topic, setTopic] = useState(firstAvailableTopic);

  // if completion list or topics change (e.g., after fetch), keep topic valid
  useEffect(() => {
    if (!topic || completedTopics.includes(topic)) {
      setTopic(firstAvailableTopic);
    }
  }, [completedTopics, firstAvailableTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  const rejoinMeeting = () => {
    alert("Rejoining your ongoing meeting…");
    // TODO: navigate to meeting room once pressed
  };

  const [status, setStatus] = useState("idle");
  // const timer = useRef(null);

  // timeout: after 60s
  const SEARCH_TIMEOUT_MS = 60_000;
  // check every 1.5s if there is a match
  const POLL_INTERVAL_MS = 1500;

  const timeoutRef = useRef(null);
  const pollRef = useRef(null);

  const startSearch = () => {
    setStatus("searching");

    // clear previous timers
    clearTimeout(timeoutRef.current);
    clearInterval(pollRef.current);

    // timeout after 60s
    timeoutRef.current = setTimeout(() => {
      clearInterval(pollRef.current);
      setStatus("no_match");
    }, SEARCH_TIMEOUT_MS);



    // TODO: Connect to backend to see if a match has been found
    // poll for a match until timeout
    createMatchRequest({ topic, difficulty }, token)
    .then((request) => {
      setReqId(request.id);
      // Poll for its status periodically
      pollRef.current = setInterval(() => {
        getMatchRequestStatus(request.id, token)
          .then((statusRes) => {
            if (statusRes.status === "matched") {
              setMatchId(statusRes.match_id);
              clearTimeout(timeoutRef.current);
              clearInterval(pollRef.current);
              setStatus("found");
            }
          })
          .catch((err) => {
            console.error("Error during match polling:", err);
          });
      }, POLL_INTERVAL_MS);
    })
    .catch((err) => {
      console.error("Error creating match request:", err);
      setStatus("no_match");
    });
  };

  const cancelSearch = () => {
    clearTimeout(timeoutRef.current);
    clearInterval(pollRef.current);
    setStatus("idle");
  };

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  // TODO: confirm match logic: navigate user to the correct meeting room
    
  const confirmMatch = async () => {
    try {
      setStatus("confirming_match");

      const res = await confirmMatchApi({ match_id: matchId, confirmed: true }, token);
      
      if (res.detail === "Waiting for partner confirmation") {
        // stay in preparing state
        setStatus("waiting_for_partner");
        return;
      }

      if (res.session_id) {
        setSessionId(res.session_id);
        setQuestionId(res.question_id);
        setStatus("preparing_session");
      } else {
        console.warn("Unexpected response from confirm API:", res);
      }
    } catch (err) {
      console.error("Error confirming match:", err);
      setStatus("error");
    }
  };

  useEffect(() => {
    let interval;

    if (status === "waiting_for_partner") {
      interval = setInterval(async () => {
          const res = await confirmMatchApi({ match_id: matchId, confirmed: true }, token);
          if (res.session_id) {
            setSessionId(res.session_id);
            setQuestionId(res.question_id);
            setStatus("preparing_session");
          }
        }, 2000); // every 2s
    }

    return () => clearInterval(interval);
  }, [status, matchId, token]);

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

  const retry = () => startSearch();

  const topicCompleted = topic && completedTopics.includes(topic);
  const allCompleted = topics.every((t) => completedTopics.includes(t));
  const disableStart = !topic || topicCompleted || allCompleted;

  return (
    <div className="min-h-screen bg-[#D7D6E6]">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex gap-6">
          {hasOngoingMeeting && <OngoingMeetingCard onRejoin={rejoinMeeting} />}

          <section className="flex-1 rounded-2xl bg-white p-8 shadow border border-gray-200">
            {status === "idle" && (
              <>
                <h1 className="text-center text-2xl md:text-3xl font-bold text-[#4A53A7]">
                  Let’s code together – click to match!
                </h1>

                <div className="mt-8 space-y-8 flex flex-col items-center">
                  <DifficultyPicker value={difficulty} onChange={setDifficulty} />

                  <TopicSelect
                    value={topic}
                    onChange={setTopic}
                    topics={topics}
                    completedTopics={completedTopics}
                  />

                  {topicCompleted && (
                    <p className="text-sm text-red-600">
                      You’ve completed all questions for <strong>{topic}</strong>. Please choose another topic.
                    </p>
                  )}

                  {/* if everything is completed */}
                  {allCompleted && (
                    <p className="text-sm text-amber-700 text-center">
                      Yay! You’ve completed every available topic! Check back later for new topics!
                    </p>
                  )}

                  <button
                    onClick={startSearch}
                    disabled={disableStart}
                    className={`mt-2 inline-flex items-center justify-center rounded-2xl
                               text-white text-2xl font-bold px-8 py-3 w-[320px]
                               hover:opacity-95
                               ${disableStart ? "bg-gray-400 cursor-not-allowed" : "bg-[#4A53A7]"}`}
                    title={disableStart ? "Please choose a topic you haven't completed" : ""}
                  >
                    Start Match!
                  </button>
                </div>
              </>
            )}

            {/* spinner */}
            {status === "searching" && (
              <div className="h-[420px] w-full flex flex-col items-center justify-center gap-6">
                <h2 className="text-xl md:text-2xl font-bold text-[#262D6C]">Finding your match...</h2>

                <div className="relative h-24 w-24">
                  <div className="absolute inset-0 rounded-full border-8 border-gray-200/70" />
                  <div
                    className="absolute inset-0 rounded-full border-8 border-[#4A53A7]
                               border-t-transparent border-r-transparent animate-spin"
                  />
                </div>
              </div>
            )}

            {/* Match is found */}
            {status === "found" && (
              <div className="h-[420px] w-full flex flex-col items-center justify-center gap-3">
                {/* Checkmark icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-12 w-12 mb-2 text-[#2E2F74]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>

                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#2E2F74]">Match Found!</h2>
                  <p className="text-[#262D6C] mt-6 text-[20px]">Click to confirm collaboration:</p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={cancelSearch}
                    className="px-6 py-2 rounded-2xl bg-[#A74A4C] text-white font-semibold hover:opacity-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmMatch}
                    className="px-6 py-2 rounded-2xl bg-[#4A53A7] text-white font-semibold hover:opacity-95"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {/* No match found */}
            {status === "no_match" && (
              <div className="h-[420px] w-full flex flex-col items-center justify-center gap-3">
                {/* Cross icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-16 w-16 text-[#2E2F74]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>

                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#2E2F74]">No Match Found</h2>
                  <p className="text-[#262D6C] mt-6 text-[20px]">Try again later?</p>
                </div>

                <button
                  onClick={retry}
                  className="px-6 py-2 rounded-2xl bg-[#4A53A7] text-white font-semibold hover:opacity-95"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Preparing session */}
            {status === "waiting_for_partner" && (
              <div className="h-[420px] w-full flex flex-col items-center justify-center gap-6">
                <h2 className="text-xl md:text-2xl font-bold text-[#262D6C]">Wating for partner confirmation...</h2>

                <div className="relative h-24 w-24">
                  <div className="absolute inset-0 rounded-full border-8 border-gray-200/70" />
                  <div
                    className="absolute inset-0 rounded-full border-8 border-[#4A53A7]
                               border-t-transparent border-r-transparent animate-spin"
                  />
                </div>
              </div>
            )}

            {/* Preparing session */}
            {status === "preparing_session" && (
              <SessionLoading
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
