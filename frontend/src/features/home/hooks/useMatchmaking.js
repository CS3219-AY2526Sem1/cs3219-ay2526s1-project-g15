import { useState, useEffect, useRef, useMemo } from "react";
import { me } from "../../auth/api";
import {
  createMatchRequest,
  cancelMatchRequest,
  getMatchRequestStatus,
  confirmMatch as confirmMatchApi,
  getMatchStatus,
  getSessionDetails,
} from "../../../shared/api/matchingService";
import { questionService } from "../../../shared/api/questionService";

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
  const [topicDifficultyMatrix, setTopicDifficultyMatrix] = useState({});

  const token = localStorage.getItem("accessToken");

  // fetch user
  useEffect(() => {
    me().then(u => {
      setUserId(u.id);
      setUsername(u.name || "Guest");
    });
  }, []);

  // Function to build the topic-difficulty matrix from questions
  const buildTopicDifficultyMatrix = (questions) => {
    const matrix = {};
    
    questions.forEach(q => {
      q.topics.forEach(topic => {
        if (!matrix[topic]) {
          matrix[topic] = [];
        }
        // Capitalize difficulty to match UI format
        const difficulty = q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1);
        if (!matrix[topic].includes(difficulty)) {
          matrix[topic].push(difficulty);
        }
      });
    });
    
    // Sort difficulties in each topic (Easy, Medium, Hard)
    const order = { Easy: 0, Medium: 1, Hard: 2 };
    Object.keys(matrix).forEach(topic => {
      matrix[topic].sort((a, b) => order[a] - order[b]);
    });
    
    return matrix;
  };

  // fetch topics and build matrix
  useEffect(() => {
    const fetchQuestionsAndTopics = async () => {
      try {
        // Fetch all questions to build the matrix
        const questions = await questionService.getQuestions();
        
        // Extract unique topics
        const allTopics = [...new Set(questions.flatMap(q => q.topics))].sort();
        setTopics(allTopics);
        
        // Build the topic difficulty matrix
        const matrix = buildTopicDifficultyMatrix(questions);
        setTopicDifficultyMatrix(matrix);
      } catch (error) {
        console.error('Error fetching questions:', error);
        // just fetch topics if questions fetch fails
        questionService.getTopics().then(setTopics).catch(console.error);
      }
    };
    
    fetchQuestionsAndTopics();
  }, []);

  const completedTopics = [];
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
    cancelMatchRequest(reqId, token).catch(console.error);
    setStatus("idle");
  };

  const confirmMatch = async () => {
    setStatus("confirming_match");
    const res = await confirmMatchApi({ match_id: matchId, confirmed: true }, token);

    if (res.status === "waiting_for_partner") {
      setStatus("waiting_for_partner");

      timeoutRef.current = setTimeout(() => {
        setStatus("confirm_timeout");
      }, 120000);

    } else if (res.session_id) {
      setSessionId(res.session_id);
      setStatus("preparing_session");
    }
  };

  useEffect(() => {
    let interval;
    if (status === "waiting_for_partner") {
      interval = setInterval(async () => {
        try {
          const res = await getMatchStatus(matchId, token);

          if (res.confirm_status) {
            const session_details = await getSessionDetails(res.session_id, token);
            setQuestionId(session_details.question.id);
            setSessionId(res.session_id);
            setStatus("preparing_session");
          }

        } catch (err) {
          if (err.message?.includes("404") || err?.response?.status === 404) {
            console.warn("Match no longer exists — timing out");
            clearInterval(interval);
            setStatus("confirm_timeout");
          } else {
            console.error("Error checking match status", err);
          }
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
    setStatus,
    topic,
    setTopic,
    difficulty,
    setDifficulty,
    topics,
    topicDifficultyMatrix, 
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