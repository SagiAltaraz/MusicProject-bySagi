const express = require('express');
const cors = require('cors');
// const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Routes = require('./routes/Routes');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: true,           // allows localhost + future domain
  credentials: true
}));
app.use(express.json());

app.use(Routes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on → http://localhost:${PORT}`);
});