import axios from "axios";

const GATEWAY = process.env.REACT_APP_API_GATEWAY_URL || "";
export const attemptsApi = axios.create({
    baseURL: `${GATEWAY}/api/v1/attempts`,
    withCredentials: false,
});

attemptsApi.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export async function createAttempt({question_id, language, submitted_code, passed_tests, total_tests}) {
    const payload = {
        question_id: Number(question_id),
        language,
        submitted_code,
        passed_tests: Number(passed_tests),
        total_tests: Number(total_tests),
    };
    const { data } = await attemptsApi.post("/", payload);
    return data; // AttemptRead
}

export async function listMyAttempts({ limit = 100, offset = 0 } = {}) {
    const { data } = await attemptsApi.get("/me", { params: { limit, offset } });
    return data; // AttemptRead[]
}

export async function myAttemptsSummary() {
    const { data } = await attemptsApi.get("/me/summary");
    return data; // { total_attempts, solved, last_attempt_at }
}

// fake endpoint
export async function getAttemptById(id) {
  // TODO: replace with real fetch when backend is ready
  return {
    id,
    question_id: 2,
    language: "javascript",
    submitted_code: `function twoSum(nums, target) {
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (map[need] !== undefined) return [map[need], i];
    map[nums[i]] = i;
  }
}`,
    passed_tests: 2,
    total_tests: 3,
    testCaseResults: [
      { id: 1, isCorrect: true, userOutput: "[0,1]" },
      { id: 2, isCorrect: true, userOutput: "[1,2]" },
      { id: 3, isCorrect: false, userOutput: "[]" },
    ],
    created_at: new Date().toISOString(),
  };
}

