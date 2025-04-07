const axios = require('axios');

const searchOnYouTube = async function (req,res) {
    const {searchQuery} = req.query;
    if(!searchQuery){
        return res.status(400).json({error: "Search query is required"});
    }
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=30&key=${process.env.YoutubeAPI}`;
    
    try{
        const response = await axios.get(url);
        res.json(response.data);
    }catch(err){
        console.error(err);
        res.status(500).json({error: "An error occurred while searching"});
    }
}
module.exports = {searchOnYouTube};