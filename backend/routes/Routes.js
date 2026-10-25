const express = require('express');
const router = express.Router();
const { searchOnYouTube } = require('../controllers/searchsong');
const { downloadFromYoutube } = require('../controllers/download');
const { askFromAI } = require('../controllers/chatassistant');
const { getSuggestions } = require('../controllers/suggest');
const { handleMusicAgent } = require('../controllers/musicAgentController');

router.get('/searchSongs', searchOnYouTube);
router.get('/downloadSong', downloadFromYoutube);
router.post('/askAI', askFromAI);
router.get('/suggest', getSuggestions);
router.post('/musicAgent', handleMusicAgent);

module.exports = router;
