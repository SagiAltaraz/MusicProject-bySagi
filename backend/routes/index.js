const express = require("express");
const validate = require("../middleware/validate");
const limits = require("../middleware/rateLimits");
const { search, suggest, searchSchema, suggestSchema } = require("../controllers/search");
const { ask, clear, chatSchema, clearSchema } = require("../controllers/chat");
const { health } = require("../controllers/health");
const { downloadFromYoutube } = require("../controllers/download");

const router = express.Router();

router.get("/health", health);

router.get("/searchSongs", validate(searchSchema), search);
router.get("/suggest", validate(suggestSchema), suggest);

router.post("/askAI", limits.ai, validate(chatSchema, "body"), ask);
router.post("/askAI/clear", validate(clearSchema, "body"), clear);

router.get("/downloadSong", limits.downloads, downloadFromYoutube);

module.exports = router;
