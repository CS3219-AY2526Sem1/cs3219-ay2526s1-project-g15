import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { me } from "../../auth/api";
import {
  createMatchRequest,
  getMatchRequestStatus,
  confirmMatch as confirmMatchApi,
  getMatchStatus,
  getSessionDetails,
} from "../../../shared/api/matchingService";
import { questionService } from "../../../shared/api/questionService";
import { COMPLETED_TOPICS } from "../constants";

export default function useMatchmaking() {
  const [hasOngoingMeeting, setHasOngoingMeeting] = useState(true);
  const [difficulty, setDifficulty] = useState("Medium");
  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("idle");
  const [reqId, setReqId] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [questionId, setQuestionId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("Guest");

  const token = localStorage.getItem("accessToken");
  const navigate = useNavigate();

  // fetch user
  useEffect(() => {
    me().then(u => {
      setUserId(u.id);
      setUsername(u.name || "Guest");
    });
  }, []);

  // fetch topics
  useEffect(() => {
    questionService.getTopics().then(setTopics).catch(console.error);
  }, []);

  const completedTopics = COMPLETED_TOPICS;
  const firstAvailable = useMemo(
    () => topics.find(t => !completedTopics.includes(t)) || "",
    [topics, completedTopics]
  );

  useEffect(() => {
    if (!topic || completedTopics.includes(topic)) {
      setTopic(firstAvailable);
    }
  }, [firstAvailable, completedTopics]);

  // Matchmaking timers
  const timeoutRef = useRef();
  const pollRef = useRef();

  const startSearch = () => {
    setStatus("searching");
    clearTimeout(timeoutRef.current);
    clearInterval(pollRef.current);

    createMatchRequest({ topic, difficulty }, token)
      .then((req) => {
        setReqId(req.id);
        pollRef.current = setInterval(async () => {
          const statusRes = await getMatchRequestStatus(req.id, token);
          if (statusRes.status === "matched") {
            clearTimeout(timeoutRef.current);
            clearInterval(pollRef.current);
            setMatchId(statusRes.match_id);
            setStatus("found");
          }
        }, 1500);

        timeoutRef.current = setTimeout(() => {
          clearInterval(pollRef.current);
          setStatus("no_match");
        }, 60000);
      })
      .catch(() => setStatus("no_match"));
  };

  const cancelSearch = () => {
    clearTimeout(timeoutRef.current);
    clearInterval(pollRef.current);
    setStatus("idle");
  };

  const confirmMatch = async () => {
    setStatus("confirming_match");
    const res = await confirmMatchApi({ match_id: matchId, confirmed: true }, token);

    if (res.status === "waiting_for_partner") {
      setStatus("waiting_for_partner");
    } else if (res.session_id) {
      setSessionId(res.session_id);
      setStatus("preparing_session");
    }
  };

  useEffect(() => {
    let interval;
    if (status === "waiting_for_partner") {
      interval = setInterval(async () => {
        const res = await getMatchStatus(matchId, token);
        if (res.confirm_status) {
          const session_details = await getSessionDetails(res.session_id, token);
          setQuestionId(session_details.question.id);
          setSessionId(res.session_id);
          setStatus("preparing_session");
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status, matchId, token]);

  const retry = () => startSearch();

  const topicCompleted = topic && completedTopics.includes(topic);
  const allCompleted = topics.every(t => completedTopics.includes(t));
  const disableStart = !topic || topicCompleted || allCompleted;

  return {
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
  };
}
