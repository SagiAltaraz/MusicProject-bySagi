const axios = require("axios");
const { LRUCache } = require("lru-cache");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const API = "https://www.googleapis.com/youtube/v3";
const MIN_DURATION_SECONDS = 60;

// search.list costs 100 of the 10,000 daily quota units (~100 searches/day),
// so identical searches are served from memory for a few hours.
const searchCache = new LRUCache({ max: 500, ttl: 6 * 60 * 60 * 1000 });
const suggestCache = new LRUCache({ max: 1000, ttl: 60 * 60 * 1000 });

// Parse ISO 8601 duration (PT1H4M30S) to seconds
const parseDuration = (iso = "") => {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const [, h = 0, m = 0, s = 0] = match;
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
};

const toAppError = (err) => {
    const status = err.response?.status;
    const reason = err.response?.data?.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
        return new AppError(429, "YOUTUBE_QUOTA", "YouTube API daily quota is used up. Try again tomorrow.");
    }
    if (status === 400 || status === 403) {
        return new AppError(502, "YOUTUBE_KEY", "YouTube API rejected the request. Check the API key in backend/.env.");
    }
    return new AppError(502, "YOUTUBE_UNAVAILABLE", "Could not reach YouTube. Check your connection.");
};

/**
 * Search YouTube videos and attach durationSeconds to each item.
 * @param {{query: string, genre?: string, maxDuration: number}} opts maxDuration in seconds, 0 = no limit
 * @returns {Promise<{items: object[], hiddenLong: number}>}
 */
const searchVideos = async ({ query, genre, maxDuration }) => {
    if (!env.YOUTUBE_API_KEY) {
        throw new AppError(500, "YOUTUBE_KEY_MISSING", "Missing YOUTUBE_API_KEY in backend/.env.");
    }

    const q = genre ? `${genre} ${query}` : query;
    const cacheKey = `${q.toLowerCase()}|${maxDuration}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    try {
        const { data: search } = await axios.get(`${API}/search`, {
            params: { part: "snippet", q, type: "video", maxResults: 40, key: env.YOUTUBE_API_KEY },
            timeout: 10000,
        });
        const items = search.items || [];
        if (items.length === 0) return { items: [], hiddenLong: 0 };

        // One batch call for every duration
        const { data: details } = await axios.get(`${API}/videos`, {
            params: { part: "contentDetails", id: items.map((i) => i.id.videoId).join(","), key: env.YOUTUBE_API_KEY },
            timeout: 10000,
        });
        const durations = new Map(details.items.map((v) => [v.id, parseDuration(v.contentDetails.duration)]));

        const playable = items
            // Live/upcoming streams can't be downloaded as a finished track
            .filter((item) => item.snippet.liveBroadcastContent === "none")
            .map((item) => ({ ...item, durationSeconds: durations.get(item.id.videoId) || 0 }))
            // Under a minute is a Short or a teaser, never a playable track
            .filter((item) => item.durationSeconds >= MIN_DURATION_SECONDS);
        const results = playable.filter((item) => !maxDuration || item.durationSeconds <= maxDuration);

        // The UI tells the user how many longer videos (DJ sets, mixes) were hidden
        const result = { items: results, hiddenLong: playable.length - results.length };
        searchCache.set(cacheKey, result);
        return result;
    } catch (err) {
        throw err instanceof AppError ? err : toAppError(err);
    }
};

// YouTube's autocomplete service (unofficial but widely used by clients)
const getSuggestions = async (q) => {
    const key = q.toLowerCase();
    const cached = suggestCache.get(key);
    if (cached) return cached;
    try {
        const { data } = await axios.get("https://suggestqueries.google.com/complete/search", {
            params: { client: "firefox", ds: "yt", q },
            timeout: 6000,
        });
        // Response format: [ query, [suggestion1, suggestion2, ...] ]
        const suggestions = Array.isArray(data?.[1]) ? data[1].slice(0, 8) : [];
        suggestCache.set(key, suggestions);
        return suggestions;
    } catch {
        return [];
    }
};

module.exports = { searchVideos, getSuggestions, parseDuration };
