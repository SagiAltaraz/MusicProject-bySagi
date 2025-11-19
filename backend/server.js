const express = require('express');
const cors = require('cors');
const webhook = require('./controllers/webhook');
// const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Routes = require('./routes/Routes')
const{Configuration, OpenAIApi} = require('openai');

dotenv.config();
const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use('/webhook', webhook);
app.use(Routes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (!process.env.YoutubeAPI || String(process.env.YoutubeAPI).trim().length === 0) {
        console.warn("[WARN] YoutubeAPI key is not set. Create backend/.env with YoutubeAPI=YOUR_KEY");
    }
});
