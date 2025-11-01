import { useState, useEffect, use } from "react";
import { questionService } from "../../../shared/api/questionService";
import { getSessionDetails } from "../../../shared/api/matchingService";

export default function ProblemPanel({ sessionId, className = "" }) {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const fetchQuestion = async () => {
      try {
        setLoading(true);

        const sessionDetails = await getSessionDetails(sessionId);
        const question_id = sessionDetails.question.id;
        console.log("Fetched session details:", sessionDetails);
        const questionData = await questionService.getQuestion(question_id);
        console.log("Fetched question data:", questionData);
        setQuestion(questionData);
      } catch (err) {
        console.error("Error fetching session details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [sessionId]);

  if (loading) {
    return <div className="text-white">Loading question...</div>;
  }

  if (!question) {
    return <div className="text-white">Question not found</div>;
  }

  return (
    <aside className={`w-full lg:w-full rounded-2xl bg-[#5F5699] text-white p-6 shadow border border-white/10 ${className}`}>
      <h2 className="text-lg font-bold mb-2">{question.title}</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {question.topics.map((topic) => (
          <span key={topic} className="px-3 py-1 rounded-full bg-white/15 text-center justify-center">
            {topic}
          </span>
        ))}
        <span className="px-3 py-1 rounded-full bg-white/15 text-center justify-center">
          {question.difficulty}
        </span>
      </div>

      {/* TODO: change question to whatever is in the backend that matches whatever the user selected*/}
      <div className="text-white/90 text-sm leading-relaxed prose prose-invert">
        <div dangerouslySetInnerHTML={{ __html: question.description }} />
      </div>

      {question.examples?.length > 0 && (
        <div className="mt-6 space-y-4 text-sm">
          {question.examples.map((ex, idx) => (
            <div key={idx} className="bg-white/10 p-2 rounded break-words">
              <p className="font-semibold mb-1">Example {idx + 1}:</p>
              <p>Input: {ex.input}</p>
              <p>Output: {ex.output}</p>
              {ex.explanation && <p className="text-white/80">{ex.explanation}</p>}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
