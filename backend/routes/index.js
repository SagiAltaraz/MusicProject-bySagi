const express = require("express");
const validate = require("../middleware/validate");
const limits = require("../middleware/rateLimits");
const { search, suggest, searchSchema, suggestSchema } = require("../controllers/search");
const { ask, clear, chatSchema, clearSchema } = require("../controllers/chat");
const { health } = require("../controllers/health");
const dl = require("../controllers/download");

const router = express.Router();

// Express 4 doesn't forward errors thrown synchronously in handlers that
// look up jobs - wrap them so a missing id becomes a clean 404.
const safe = (fn) => (req, res, next) => {
    try {
        return fn(req, res, next);
    } catch (err) {
        return next(err);
    }
};

router.get("/health", health);

router.get("/searchSongs", validate(searchSchema), search);
router.get("/suggest", validate(suggestSchema), suggest);

router.post("/askAI", limits.ai, validate(chatSchema, "body"), ask);
router.post("/askAI/clear", validate(clearSchema, "body"), clear);

router.get("/profiles", dl.listProfiles);
router.get("/trackInfo", validate(dl.trackInfoSchema), dl.trackInfo);

router.post("/downloads", limits.downloads, validate(dl.createSchema, "body"), dl.createDownload);
router.get("/downloads", dl.listDownloads);
router.get("/downloads/:id", safe(dl.getDownload));
router.get("/downloads/:id/events", safe(dl.downloadEvents));
router.get("/downloads/:id/file", safe(dl.downloadFile));
router.post("/downloads/:id/reveal", safe(dl.revealDownload));
router.delete("/downloads/:id", safe(dl.cancelDownload));

router.get("/downloadSong", limits.downloads, validate(dl.legacySchema), dl.legacyDownload);

module.exports = router;
