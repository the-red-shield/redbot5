import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios'; // Add axios for making HTTP requests
import dotenv from 'dotenv'; // Add dotenv for loading environment variables
import { setRoutes } from './routes/index.js';
import { client } from '../redbot5.js'; // Correct import path for redbot5.js

// Load environment variables from .env file
dotenv.config();

// Debug: Print environment variables
console.log('Environment Variables:', {
  PAYPAL_WEBHOOK_URL: process.env.PAYPAL_WEBHOOK_URL,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  DISCORD_CATEGORY_ID: process.env.DISCORD_CATEGORY_ID,
  DISCORD_CHANNEL_ID: process.env.DISCORD_CHANNEL_ID
});

const app = express();
const PORT = process.env.PORT || 3000; // Change the port to 3000

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

setRoutes(app);

// Validate environment variables
if (!process.env.PAYPAL_WEBHOOK_URL || !process.env.DISCORD_WEBHOOK_URL || !process.env.DISCORD_CATEGORY_ID || !process.env.DISCORD_CHANNEL_ID) {
  console.error('PAYPAL_WEBHOOK_URL, DISCORD_WEBHOOK_URL, DISCORD_CATEGORY_ID, and DISCORD_CHANNEL_ID must be set in the environment variables');
  process.exit(1);
}

// Route for PayPal webhooks
app.post(process.env.PAYPAL_WEBHOOK_URL, async (req, res) => { // Use environment variable for PayPal webhook URL
  const { event_type, resource } = req.body;

  try {
    // Process the PayPal webhook event
    // Extract label notes if available
    const labelNotes = resource && resource.note_to_payer ? resource.note_to_payer : 'No notes';

    // Handle the event
    switch (event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Handle checkout order approved
        console.log('Order approved:', req.body);
        console.log('Label notes:', labelNotes);
        break;
      case 'PAYMENT.SALE.COMPLETED':
        // Handle payment sale completed
        console.log('Payment completed:', req.body);
        console.log('Label notes:', labelNotes);
        break;
      // Add more cases as needed
      default:
        console.log('Unhandled event type:', event_type);
        console.log('Label notes:', labelNotes);
    }

    // Send data to Discord webhook
    const discordResponse = await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      event_type,
      label_notes: resource.note_to_payer,
      event_data: {
        event_type,
        resource
      }
    });

    // Check if the Discord response is successful
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
  console.log('Received request on /discord endpoint'); // Add logging to identify multiple requests
  const { event_type, label_notes, event_data } = req.body;

  // Process the data and send a message to a Discord channel
  const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);

  if (!channel) {
    console.error('Channel not found');
    return res.status(404).send('Channel not found');
  }

  channel.send(`Event Type: ${event_type}\nLabel Notes: ${label_notes}\nEvent Data: ${JSON.stringify(event_data, null, 2)}`)
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

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Logged in as ${client.user.tag}`); // Ensure the client.user property is correctly used
});

export { app, server }; // Export the server instance for testing