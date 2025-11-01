import { useState } from "react";

export default function useSubmission(sessionId, userId, username) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState("");

  const submitSolution = async (src, lang) => {
    setIsSubmitting(true);
    setSubmitBanner("Submitting solution...");
    /* try {
      const base = import.meta.env.VITE_API_GATEWAY_URL || "";
      const res = await fetch(`${base}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userId,
          username,
          language: lang,
          source: src,
          problem: { id: "141", slug: "linked-list-cycle" }, // MOCK
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json().catch(() => ({}));

      setSubmitBanner("Solution submitted successfully!");
      setTimeout(() => setSubmitBanner(""), 2500);
    } catch (err) {
      setSubmitBanner(`Submission failed: ${err.message}`);
      setTimeout(() => setSubmitBanner(""), 3000);
    } finally {
      setIsSubmitting(false);
    }
      */
  };
    
  return { submitSolution, isSubmitting, submitBanner, setSubmitBanner };
}
