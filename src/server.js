import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { setRoutes } from './routes/index.js';
import { client } from '../redbot5.js'; // Ensure correct import path for redbot5.js

// Load environment variables from .env file
dotenv.config();

// Debug: Print environment variables
console.log('Environment Variables:', {
  PAYPAL_WEBHOOK_URL: process.env.PAYPAL_WEBHOOK_URL,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  DISCORD_CATEGORY_ID: process.env.DISCORD_CATEGORY_ID,
  DISCORD_CHANNEL_ID: process.env.DISCORD_CHANNEL_ID,
  DISCORD_CLIENT_NUMBER: process.env.DISCORD_CLIENT_NUMBER,
  DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY // Ensure DISCORD_PUBLIC_KEY is logged
});

const app = express();
const PORT = process.env.PORT || 3000; // Ensure the server runs on the correct port

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

setRoutes(app);

// Validate environment variables
if (!process.env.DISCORD_WEBHOOK_URL || !process.env.DISCORD_CATEGORY_ID || !process.env.DISCORD_CHANNEL_ID) {
  console.error('DISCORD_WEBHOOK_URL, DISCORD_CATEGORY_ID, and DISCORD_CHANNEL_ID must be set in the environment variables');
  process.exit(501);
}

app.get('/', (req, res) => {
  try {
    res.send('Welcome to the Redbot5 application!');
  } catch (error) {
    console.error('Error in root route:', error);
    res.status(502).send('Internal Server Error');
  }
});

let server; // Declare server variable

const startBot = process.env.LIVE_HOOKS === 'true'; // Add a flag to control bot startup

// Start the server first
server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  if (client) { // Ensure the bot client starts
    client.once('ready', () => {
      console.log(`Logged in as ${client.user.tag}`);
    });

    client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
      console.error('Error logging in to Discord:', error.message);
      console.error(error.stack);
      process.exit(503);
    }); // Use environment variable for bot token
  }
});

server.on('error', (error) => {
  console.error('Server error:', error.message);
  console.error(error.stack);
  process.exit(504);
});

export { app, server }; // Export the server instance for testing