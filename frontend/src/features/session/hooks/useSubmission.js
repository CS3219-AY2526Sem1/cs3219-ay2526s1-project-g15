import { useState } from "react";
import { createAttempt } from "../../../shared/api/attemptsApi";

export default function useSubmission(sessionId, userId, username) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState("");

  const submitAttempt = async ({ questionId, language, code, passed, total }) => {
    setIsSubmitting(true);
    setSubmitBanner("Submitting solution...");

    try {
      const data = await createAttempt({
        question_id: questionId,
        language,
        submitted_code: code,
        passed_tests: passed,
        total_tests: total,
      });

      setSubmitBanner("Solution saved!");
      setTimeout(() => setSubmitBanner(""), 2500);
      return data;
    } catch (error) {
      setSubmitBanner(`Submission failed: ${error.message}`);
      setTimeout(() => setSubmitBanner(""), 3500);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSolution = async (payload) => {
    const adaptedPayload = {
      questionId: payload?.questionId,
      language: payload?.language,
      code: payload?.code,
      passed: payload?.passedTestCases,
      total: payload?.totalTestCases,
    };
    return submitAttempt(adaptedPayload);
  }
    
  return { submitSolution, isSubmitting, submitBanner, setSubmitBanner };
}
