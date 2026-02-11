const express = require('express');
const router = express.Router();
const { searchOnYouTube } = require('../controllers/searchsong');
const { downloadFromYoutube } = require('../controllers/download');
const { askFromAI } = require('../controllers/chatassistant');

router.get('/searchSongs', searchOnYouTube);
router.get('/downloadSong', downloadFromYoutube);
router.post('/askAI', askFromAI);

module.exports = router;
