import express from 'express';
import dotenv from 'dotenv';
import path from 'path'; // Import path module
import { setRoutes } from './routes/index.js';
import { client } from '../redbot5.js'; // Ensure correct import path for redbot5.js
import { requestLogger, corsMiddleware, jsonMiddleware, urlencodedMiddleware, validateEnvVariables, unknownRouteHandler, errorHandler, serveStaticFiles, handleFaviconRequest } from './middleware/middlew.js'; // Import middleware
import { handleDiscordWebhook, verifyDiscordSignature } from './controllers/discordc.js'; // Import the webhook handler and signature verification

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // Use the PORT environment variable provided by Heroku

// Use middleware
app.use(requestLogger);
app.use(corsMiddleware);
app.use(jsonMiddleware);
app.use(urlencodedMiddleware);
app.use(validateEnvVariables);

// Serve static files and handle favicon requests
const publicDir = path.join(path.resolve(), 'public');
serveStaticFiles(app, publicDir);
handleFaviconRequest(app);

// Set routes
setRoutes(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Handle Discord interaction verification
app.post('/discord/interactions', express.json({ verify: verifyDiscordSignature }), (req, res) => {
  const signature = req.header("X-Signature-Ed25519");
  const timestamp = req.header("X-Signature-Timestamp");
  const body = JSON.stringify(req.body);

  // Verify request signature
  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, "hex"),
    Buffer.from(process.env.DISCORD_PUBLIC_KEY, "hex")
  );

  if (!isVerified) {
    return res.status(401).json({ error: "Invalid request signature" });
  }

  // Handle Discord PING request
  if (req.body.type === 1) {
    return res.json({ type: 1 });
  }

  // Delegate to the existing webhook handler
  handleDiscordWebhook(req, res);
});

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
});

// Ensure the bot client starts
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
  console.error('Error logging in to Discord:', error.message);
  console.error('Stack trace:', error.stack);
  console.error('DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? 'Token is set' : 'Token is not set');
  process.exit(503);
}); // Use environment variable for bot token

server.on('error', (error) => {
  console.error('Server error:', error.message);
  console.error(error.stack);
  process.exit(505);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  console.error(error.stack);
  // Application specific logging, throwing an error, or other logic here
});

export { app, server }; // Export the server instance for testing