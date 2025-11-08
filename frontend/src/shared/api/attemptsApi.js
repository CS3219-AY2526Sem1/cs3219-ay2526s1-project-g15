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


export async function getAttemptById(questionId) {
  try {
    const { data } = await attemptsApi.get(`/${questionId}`);
    return data; // AttemptRead
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}