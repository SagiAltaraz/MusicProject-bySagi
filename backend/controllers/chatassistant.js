const { OpenAI } = require("openai");
const dotenv = require("dotenv");

dotenv.config(); // טען את .env

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in backend .env");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const askFromOpenAI = async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  
    try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful music assistant." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 300
        });
      
        const responseText = completion.choices?.[0]?.message?.content || "No response";
        res.json({ response: responseText });
      
      } catch (error) {
        console.error("OpenAI error details:", error.response?.data || error.message);
        res.status(500).json({ error: "Error calling OpenAI API" });
      }
      
  };
  

module.exports = { askFromOpenAI };
