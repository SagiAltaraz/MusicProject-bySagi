const express = require('express');
const router = express.Router();
const searchSongController = require('../controllers/searchsong');

router.get('/searchSongs',(req, res) => {
   searchSongController.searchOnYouTube(req, res);
});


module.exports = router;