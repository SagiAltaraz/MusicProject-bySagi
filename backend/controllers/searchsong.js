const axios = require('axios');

<<<<<<< HEAD
const MAX_DURATION_SECONDS = 600; // 10 minutes

// Parse ISO 8601 duration (PT4M30S) to seconds
function parseDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
=======
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
>>>>>>> main
}

const searchOnYouTube = async function (req, res) {
    const { searchQuery } = req.query;
    if (!searchQuery) {
        return res.status(400).json({ error: "Search query is required" });
    }

    try {
        // Step 1: Search for videos
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=40&key=${process.env.YoutubeAPI}`;
        const searchResponse = await axios.get(searchUrl);
        const items = searchResponse.data.items || [];

        if (items.length === 0) {
            return res.json({ items: [] });
        }

        // Step 2: Get durations for all videos in one batch call
        const videoIds = items.map((item) => item.id.videoId).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${process.env.YoutubeAPI}`;
        const detailsResponse = await axios.get(detailsUrl);

        // Build a map of videoId -> duration in seconds
        const durationMap = {};
        for (const video of detailsResponse.data.items) {
            durationMap[video.id] = parseDuration(video.contentDetails.duration);
        }

        // Step 3: Filter out videos longer than 10 minutes
        const filtered = items.filter((item) => {
            const dur = durationMap[item.id.videoId];
            return dur && dur <= MAX_DURATION_SECONDS;
        });

        res.json({ items: filtered });
    } catch (err) {
        console.error("Search error:", err.message);
        res.status(500).json({ error: "An error occurred while searching" });
    }
};

module.exports = { searchOnYouTube };
