const { runMusicAgent } = require("../agents/musicAgent");

async function handleWebhook(req, res) {
  const { question, type } = req.body;

  try {
    let result;

    if (type === "music") {
      result = await runMusicAgent(question);
    } else {
      result = { message: "Unknown agent type" };
    }

    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handleWebhook };
