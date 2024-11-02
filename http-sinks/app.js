const express = require('express');
const app = express();
const PORT = 3000;

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON request bodies
app.use(express.json());

// Import the routes
const processUrls = require("./process-urls");
const generateResearchBrief = require("./generate-research-brief");

// Set up the routes
app.use('/process-urls', processUrls);
app.use('/generate-research-brief', generateResearchBrief);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});