const express = require('express');
const router = express.Router();
const { searchOnYouTube } = require('../controllers/searchsong');
const { downloadFromYoutube } = require('../controllers/download');
<<<<<<< HEAD
const { askFromAI } = require('../controllers/chatassistant');
=======
const { askFromOpenAI } = require("../controllers/chatassistant");
const { getSuggestions } = require('../controllers/suggest');
const { handleMusicAgent } = require('../controllers/musicAgentController');

router.get('/searchSongs' , searchOnYouTube);
>>>>>>> main

router.get('/searchSongs', searchOnYouTube);
router.get('/downloadSong', downloadFromYoutube);
<<<<<<< HEAD
router.post('/askAI', askFromAI);
=======

router.post("/askAI", askFromOpenAI);

router.get('/suggest', getSuggestions);

router.post('/musicAgent', handleMusicAgent);
>>>>>>> main

module.exports = router;
