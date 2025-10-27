import os, random, aiohttp, asyncio
from typing import List, Optional, Dict, Any

QUESTION_BASE_URL = os.getenv("QUESTION_SERVICE_URL", "http://localhost:8003").rstrip("/")
QUESTION_SERVICE_BASE_PATH = os.getenv("QUESTION_SERVICE_BASE_PATH", "/api/v1")

class QuestionClient:
    """
    A lightweight async HTTP client for interacting with the Question Service.

    This client is used by the Matching Service to request questions filtered
    by topic and difficulty when a match between two users is confirmed.
    """
    def __init__(self, base_url: str = QUESTION_BASE_URL):
        self.base_url = base_url
        self.base_path = QUESTION_SERVICE_BASE_PATH

    async def _get(self, session, path, params, retries=2, timeout=3.0):
        attempt = 0
        url = f"{self.base_url}{self.base_path}{path}"
        while True:
            try:
                # Perform the GET request
                async with session.get(url, params=params, timeout=timeout) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    text = await resp.text()
                    raise RuntimeError(f"QS {resp.status}: {text}")
            except Exception:
                if attempt >= retries:
                    raise
                await asyncio.sleep(0.3 * (attempt + 1))
                attempt += 1

    async def pick_question(
        self,
        difficulty: Optional[str],
        topics: Optional[List[str]]
    ) -> Dict[str, Any]:
        """
        Select a random question from the Question Service that matches
        the given difficulty and/or topic filters.
        """
        params = {}
        if difficulty:
            params["difficulty"] = difficulty  # expects "easy|medium|hard"
        if topics:
            params["topics"] = topics          # FastAPI accepts repeated params

        async with aiohttp.ClientSession() as session:
            data = await self._get(session, "/questions/filter/topics-difficulty", params)

        if not data:
            raise RuntimeError("No questions available for the given filters.")

        chosen = random.choice(data)
        return {
            "id": chosen.get("id") or chosen.get("question_id"),
            "difficulty": chosen.get("difficulty"),
            "topics": chosen.get("topics") or [],
            "title": chosen.get("title") or chosen.get("name") or "Untitled"
        }
