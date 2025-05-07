const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config({ path: "/Applications/code-learning/MusicProject/backend/.env" });
const genAI = new GoogleGenerativeAI(process.env.GeminiAPI)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const askFromGemini = async (req, res) => { 
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Search query is required" });
    }
    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text()
        return res.json({ response });
    } catch (error) {
        console.error("Error with Gemini API:", error);
        res.status(500).json({ error: "An error occurred while processing your request" });
    }
}

module.exports = {askFromGemini};





