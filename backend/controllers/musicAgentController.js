const axios = require("axios");

async function handleMusicAgent(req, res) {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "question is required" });
  }

  try {
    const webhookURL = "http://localhost:5678/webhook/agents";

    const response = await axios.post(webhookURL, {
      question
    });

    return res.json(response.data);

  } catch (err) {
    console.error("Error in handleMusicAgent:", err.message);
    return res.status(500).json({ error: "Error calling n8n webhook" });
  }
}

module.exports = { handleMusicAgent };
