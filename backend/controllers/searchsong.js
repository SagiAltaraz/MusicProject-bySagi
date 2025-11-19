const axios = require('axios');

const searchOnYouTube = async function (req,res) {
    const {searchQuery, genre} = req.query;
    if(!searchQuery){
        return res.status(400).json({error: "Search query is required"});
    }

    if (!process.env.YoutubeAPI || String(process.env.YoutubeAPI).trim().length === 0) {
        return res.status(500).json({ error: "Missing YoutubeAPI key in backend .env" });
    }

    // If a genre is provided, bias the search by prefixing the term
    const finalQuery = genre && typeof genre === 'string' && genre.trim().length > 0
        ? `${genre} ${searchQuery}`
        : searchQuery;

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(finalQuery)}&type=video&maxResults=30&key=${process.env.YoutubeAPI}`;
    
    try{
        const response = await axios.get(url);
        res.json(response.data);
    }catch(err){
        console.error(err);
        const status = err.response?.status;
        if (status === 403 || status === 400) {
            return res.status(status).json({ error: "YouTube API error. Check API key and quota." });
        }
        res.status(500).json({error: "An error occurred while searching"});
    }
}
module.exports = {searchOnYouTube};