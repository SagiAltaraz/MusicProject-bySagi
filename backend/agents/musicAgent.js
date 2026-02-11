// agents/musicAgent.js
const { OpenAI } = require("openai");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://localhost:3035/searchSongs";

let client = null;
if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn(
    "[musicAgent] Missing OPENAI_API_KEY. The agent will not run until it is provided."
  );
}

// פונקציה שמביאה רשימת שירים פוטנציאליים
async function fetchCandidateSongs(query) {
  try {
    const { data } = await axios.get(SEARCH_SERVICE_URL, {
      params: { searchQuery: query },
    });

    const items = Array.isArray(data?.items) ? data.items : [];

    return items.slice(0, 5).map((item, idx) => ({
      index: idx + 1,
      title:
        item?.snippet?.title ||
        item?.title ||
        item?.name ||
        `Result ${idx + 1}`,
      channel: item?.snippet?.channelTitle || item?.channel || "Unknown",
      url: item?.url || `https://youtube.com/watch?v=${item?.id?.videoId || ""}`,
    }));
  } catch (err) {
    console.warn(
      `[musicAgent] searchSongs request failed: ${err.message}. Continuing without search context.`
    );
    return [];
  }
}

// פונקציית הרצה עיקרית של ה-Agent
async function runMusicAgent(question) {
  if (!question || typeof question !== "string" || !question.trim()) {
    throw new Error("Question is required");
  }

  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  const trimmedQuestion = question.trim();
  const songs = await fetchCandidateSongs(trimmedQuestion);

  const contextLines =
    songs.length > 0
      ? songs
          .map(
            (song) =>
              `${song.index}. ${song.title} by ${song.channel} (${song.url})`
          )
          .join("\n")
      : "No search results were found.";

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful AI music agent. Use the provided candidate songs when possible, and suggest additional ideas if needed.",
      },
      {
        role: "user",
        content: `User question: ${trimmedQuestion}\n\nCandidate songs:\n${contextLines}\n\nProvide a friendly answer referencing the songs when relevant.`,
      },
    ],
  });

  const answer =
    completion.choices?.[0]?.message?.content ||
    "I could not generate a response right now.";

  return {
    answer,
    songs,
  };
}

module.exports = { runMusicAgent };
