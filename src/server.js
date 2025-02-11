import express from 'express';
import dotenv from 'dotenv';
import { setRoutes } from './routes/index.js';
import { client } from '../redbot5.js'; // Ensure correct import path for redbot5.js
import { requestLogger, corsMiddleware, jsonMiddleware, urlencodedMiddleware, validateEnvVariables, unknownRouteHandler, errorHandler } from './middleware/middlew.js'; // Import middleware
import { handleDiscordWebhook } from './controllers/discordc.js'; // Import the webhook handler

// Load environment variables from .env file
dotenv.config();

// Debug: Print environment variables
console.log('Environment Variables:', {
  PAYPAL_WEBHOOK_URL: process.env.PAYPAL_WEBHOOK_URL,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  DISCORD_CATEGORY_ID: process.env.DISCORD_CATEGORY_ID,
  DISCORD_CHANNEL_ID: process.env.DISCORD_CHANNEL_ID,
  DISCORD_CLIENT_NUMBER: process.env.DISCORD_CLIENT_NUMBER,
  DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY, // Ensure DISCORD_PUBLIC_KEY is logged
  DISCORD_SERVER_HOOK: process.env.DISCORD_SERVER_HOOK // Log DISCORD_SERVER_HOOK
});

const app = express();
const PORT = process.env.PORT || 3000; // Ensure the server runs on the correct port

// Use middleware
app.use(requestLogger);
app.use(corsMiddleware);
app.use(jsonMiddleware);
app.use(urlencodedMiddleware);
app.use(validateEnvVariables);

setRoutes(app);

// Handle Discord interaction verification
app.post('/discord/', handleDiscordWebhook);

app.get('/', (req, res) => {
  try {
    res.send('Welcome to the Redbot5 application!');
  } catch (error) {
    console.error('Error in root route:', error);
    res.status(502).send('Internal Server Error');
  }
});

// Handle unknown routes
app.use(unknownRouteHandler);

// Error handling middleware should be the last middleware
app.use(errorHandler);

let server; // Declare server variable

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
  } else {
    console.error('Discord client is not defined');
    process.exit(504);
  }
});

server.on('error', (error) => {
  console.error('Server error:', error.message);
  console.error(error.stack);
  process.exit(505);
});

export { app, server }; // Export the server instance for testing