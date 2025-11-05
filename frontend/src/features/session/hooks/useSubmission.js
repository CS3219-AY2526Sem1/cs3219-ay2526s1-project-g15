import { useState } from "react";

export default function useSubmission(sessionId, userId, username) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState("");

  function getAccessToken() {
    return localStorage.getItem("accessToken");
  }

  const submitAttempt = async ({ questionId, language, code, passed, total }) => {
    setIsSubmitting(true);
    setSubmitBanner("Submitting solution...");

    try {
      const url = `http://localhost:8080/api/v1/attempts/`;
      console.log("Submitting to URL:", url);

      const token = getAccessToken();
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_id: Number(questionId),
          language,
          submitted_code: code,
          passed_tests: Number(passed),
          total_tests: Number(total),
        }),
      });

      if (!response.ok) {
        const msg = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}${msg ? ` – ${msg}` : ""}`);
      }

      const data = await response.json().catch(() => ({}));
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
