const express = require('express');
const cors = require('cors');
const path = require('path');
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

// API Routes
app.use('/', Routes);  // all your /downloadSong, /searchSongs etc.

// Serve React build (Vite or CRA)
const frontendPath = path.join(__dirname, '../frontend/dist'); // change to ../build if using CRA
app.use(express.static(frontendPath));

// Catch-all: serve React app for any non-API route
app.get('*', (req, res) => {
  // Don't interfere with API calls
  if (req.path.startsWith('/downloadSong') || 
      req.path.startsWith('/searchSongs') || 
      req.path.includes('.')) {  // files like .js, .png etc.
    return res.status(404).send();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Port only exists here — never seen again
const PORT = process.env.PORT || 3035;

app.listen(PORT, () => {
  console.log(`Server is running on → http://localhost:${PORT}`);
});