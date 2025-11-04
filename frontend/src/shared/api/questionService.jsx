const API_BASE = 'http://localhost:8003/api/v1/questions/';

function authHeaders() {
  const t = localStorage.getItem('accessToken');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchJson(url, init = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: 'application/json', ...(init.headers || {}) },
    });
  } catch (err) {
    // This is the "Failed to fetch" case: browser never got a response
    const e = new Error(`Question already exists! Please choose a different question name.`);
    e.isNetworkError = true;
    throw e;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const backendMsg =
      (data && (data.detail || data.message || data.error)) ||
      (typeof data === 'string' ? data : null);

    const e = new Error(
      backendMsg || `Request failed with status ${res.status}`
    );
    e.status = res.status;
    e.data = data;
    throw e;
  }

  return data;
}



export const questionService = {
  async getQuestions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch questions');
    const data = await response.json();

    // Handle paginated response format
    if (data.questions && Array.isArray(data.questions)) {
        return data.questions;
    }
    // Handle plain array response
    if (Array.isArray(data)) {
        return data;
    }

    console.error('Unexpected API response format:', data);
    return [];
  },

  async getQuestion(id) {
    return fetchJson(`${API_BASE}${id}`, { headers: authHeaders() });
  },

  async filterQuestions(topics = [], difficulty) {
    const url = new URL(`${API_BASE}filter/topics-difficulty`, window.location.origin);
    topics.forEach(t => url.searchParams.append('topics', t));
    if (difficulty) url.searchParams.set('difficulty', difficulty);

    const data = await fetchJson(url.toString(), { headers: authHeaders() });
    if (data.questions && Array.isArray(data.questions)) {
        return data.questions;
    }
    if (Array.isArray(data)) {
        return data;
    }
    console.error('Unexpected API response format:', data);
    return [];
  },

  async createQuestion(data) {
    return fetchJson(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
  },

  async updateQuestion(id, data) {
    return fetchJson(`${API_BASE}${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
  },

  async deleteQuestion(id) {
    const res = await fetch(`${API_BASE}${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });

    if (!res.ok) {
        throw new Error(`Failed to delete question: ${res.status} ${res.statusText}`);
    }

    // 204 No Content has no body to parse
    return { success: true };
  },

  async toggleStatus(id) {
    return fetchJson(`${API_BASE}${id}/toggle-status`, { method: 'PUT', headers: authHeaders() });
  },

  async getTopics() {
    return fetchJson(`${API_BASE}topics`, { headers: authHeaders() });
  },
};
