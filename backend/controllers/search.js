const { z } = require("zod");
const { searchVideos, getSuggestions } = require("../services/youtube");

const searchSchema = z.object({
    searchQuery: z.string({ error: "Search query is required" }).trim().min(1, "Search query is required").max(200),
    genre: z.string().trim().max(60).optional(),
    // Seconds; 0 = no limit (DJ sets / extended mixes). Default keeps it to tracks.
    maxDuration: z.coerce.number().int().min(0).max(6 * 3600).default(600),
});

const suggestSchema = z.object({
    q: z.string().trim().max(120).default(""),
});

const search = async (req, res, next) => {
    try {
        const { searchQuery, genre, maxDuration } = req.valid;
        const items = await searchVideos({ query: searchQuery, genre, maxDuration });
        res.json({ items });
    } catch (err) {
        next(err);
    }
};

const suggest = async (req, res) => {
    const { q } = req.valid;
    res.json({ suggestions: q ? await getSuggestions(q) : [] });
};

module.exports = { search, suggest, searchSchema, suggestSchema };
