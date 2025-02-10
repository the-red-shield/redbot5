import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import nacl from 'tweetnacl'; // Add tweetnacl for signature validation
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
if (!process.env.PAYPAL_WEBHOOK_URL || !process.env.DISCORD_WEBHOOK_URL || !process.env.DISCORD_CATEGORY_ID || !process.env.DISCORD_CHANNEL_ID) {
  console.error('PAYPAL_WEBHOOK_URL, DISCORD_WEBHOOK_URL, DISCORD_CATEGORY_ID, and DISCORD_CHANNEL_ID must be set in the environment variables');
  process.exit(1);
}

// Function to verify Discord webhook signature
function verifyDiscordSignature(req, res, buf) {
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    return res.status(401).send('Invalid request signature');
  }

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + buf),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex')
  );

  if (!isVerified) {
    return res.status(401).send('Invalid request signature');
  }
}

// Middleware to verify Discord webhook signature
app.use('/discord', express.json({ verify: verifyDiscordSignature }));

// Function to get PayPal access token
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post('https://api-m.sandbox.paypal.com/v1/oauth2/token', 'grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error.message);
    throw new Error('Failed to get PayPal access token');
  }
}

// Route for PayPal webhooks
app.post(process.env.PAYPAL_WEBHOOK_URL, async (req, res) => {
  const { event_type, resource } = req.body;

  try {
    const accessToken = await getPayPalAccessToken(); // Get access token
    const labelNotes = resource && resource.note_to_payer ? resource.note_to_payer : 'No notes';

    switch (event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        console.log('Order approved:', req.body);
        console.log('Label notes:', labelNotes);
        break;
      case 'PAYMENT.SALE.COMPLETED':
        console.log('Payment completed:', req.body);
        console.log('Label notes:', labelNotes);
        break;
      default:
        console.log('Unhandled event type:', event_type);
        console.log('Label notes:', labelNotes);
    }

    const discordResponse = await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      event_type,
      label_notes: resource.note_to_payer,
      event_data: {
        event_type,
        resource
      }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}` // Use access token
      }
    });

    const expectedStatus = 200;
    if (discordResponse.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus} but got ${discordResponse.status}`);
    }

    return res.status(200).send('Event processed successfully');
  } catch (error) {
    console.error('Error processing PayPal webhook:', error.message);
    return res.status(500).send(`Internal Server Error: ${error.message}`);
  }
});

// Route to handle incoming data from server.js
app.post('/discord', (req, res) => {
  console.log('Received request on /discord endpoint');
  const { type, event } = req.body;

  // Handle Discord PING event
  if (type === 0) {
    return res.sendStatus(204); // Respond with 204 No Content
  }

  // Extract event details from the inner event object
  const { type: event_type, timestamp, data: event_data } = event;

  // Validate environment variables
  const categoryId = process.env.DISCORD_CATEGORY_ID;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (!categoryId || !channelId) {
    console.error('DISCORD_CATEGORY_ID and DISCORD_CHANNEL_ID must be set in the environment variables');
    return res.status(500).send('Server configuration error');
  }

  // Process the data and send a message to a Discord channel
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found');
    return res.status(404).send('Channel not found');
  }

  if (channel.parentId !== categoryId) {
    console.error('Channel does not belong to the specified category');
    return res.status(400).send('Channel does not belong to the specified category');
  }

  channel.send(`Event Type: ${event_type}\nTimestamp: ${timestamp}\nEvent Data: ${JSON.stringify(event_data, null, 2)}`)
    .then(() => {
      console.log('Message sent to Discord channel');
      res.sendStatus(200);
    })
    .catch(error => {
      console.error('Error sending message to Discord channel:', error.message);
      console.error(error.stack);
      res.status(500).send('Error sending message to Discord channel');
    });
});

let server; // Declare server variable

// Start the server first
server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  // Start the bot client after the server is running
  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
  });

  client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Error logging in to Discord:', error.message);
    console.error(error.stack);
  }); // Use environment variable for bot token
});

export { app, server }; // Export the server instance for testing