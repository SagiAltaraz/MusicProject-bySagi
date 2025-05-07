const express = require('express');
const router = express.Router();
const { searchOnYouTube } = require('../controllers/searchsong');
const { downloadFromYoutube } = require('../controllers/download');
const {askFromGemini} = require('../controllers/chatassistant');

router.get('/searchSongs' , searchOnYouTube);

router.get('/downloadSong', downloadFromYoutube);

router.post('/askAI', askFromGemini);

module.exports = router;
