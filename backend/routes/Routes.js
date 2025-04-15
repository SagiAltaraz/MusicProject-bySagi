const express = require('express');
const router = express.Router();
const searchSongController = require('../controllers/searchsong');
const downloadSongController = require('../controllers/download');


router.get('/searchSongs',(req, res) => {
   searchSongController.searchOnYouTube(req, res);
});

router.get('/downloadSong', (req, res) => {
   downloadSongController.downloadFromYoutube(req, res);
});

module.exports = router;