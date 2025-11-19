const axios = require('axios');

// Use YouTube suggestion service to provide query recommendations
// Docs are unofficial; this endpoint is commonly used by clients
const getSuggestions = async (req, res) => {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
        return res.json({ suggestions: [] });
    }

    try {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 6000 });
        // Response format: [ query, [suggestion1, suggestion2, ...] ]
        const suggestions = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
        res.json({ suggestions });
    } catch (err) {
        console.error('suggest error', err.message);
        res.json({ suggestions: [] });
    }
};

module.exports = { getSuggestions };





