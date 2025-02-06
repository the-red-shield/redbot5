import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios'; // Add axios for making HTTP requests
import dotenv from 'dotenv'; // Add dotenv for loading environment variables
import { setRoutes } from './routes/index.js';
import { Client, GatewayIntentBits } from 'discord.js'; // Ensure correct import

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

setRoutes(app);

// Initialize Discord bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Route for PayPal webhooks
app.post(process.env.PAYPAL_WEBHOOK_URL, async (req, res) => { // Use environment variable for PayPal webhook URL
  const event = req.body;

  // Extract label notes if available
  const labelNotes = event.resource && event.resource.note_to_payer ? event.resource.note_to_payer : 'No notes';

  // Handle the event
  switch (event.event_type) {
    case 'CHECKOUT.ORDER.APPROVED':
      // Handle checkout order approved
      console.log('Order approved:', event);
      console.log('Label notes:', labelNotes);
      break;
    case 'PAYMENT.SALE.COMPLETED':
      // Handle payment sale completed
      console.log('Payment completed:', event);
      console.log('Label notes:', labelNotes);
      break;
    // Add more cases as needed
    default:
      console.log('Unhandled event type:', event.event_type);
      console.log('Label notes:', labelNotes);
  }

  // Forward the data to the Discord bot
  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, { // Use environment variable for Discord webhook URL
      event_type: event.event_type,
      label_notes: labelNotes,
      event_data: event
    });
    console.log('Data forwarded to Discord bot');
  } catch (error) {
    console.error('Error forwarding data to Discord bot:', error);
  }

  res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app; // Export the app instance for testing