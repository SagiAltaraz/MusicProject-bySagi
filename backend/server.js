const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Routes = require('./routes/Routes');

dotenv.config();
const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use(Routes);

const PORT = process.env.PORT || 3035;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
