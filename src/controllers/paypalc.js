import dotenv from 'dotenv';
import axios from 'axios';
import { client, commandData } from '../../redbot5.js'; // Ensure correct import path for redbot5.js

// Load environment variables from .env file
dotenv.config();

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

export const handlePaypalWebhook = async (req, res) => {
  const { event_type, resource } = req.body;

  if (!event_type) {
    console.error('Unhandled event type: undefined');
    return res.status(400).send('Bad Request: event_type is undefined');
  }

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

        // Check if labelNotes contains a username from commandData
        for (const username in commandData) {
          if (labelNotes.includes(username)) {
            const { channelId } = commandData[username];
            const channel = client.channels.cache.get(channelId);

            if (channel) {
              await channel.send(`Thank you @${username} for your purchase!`);
              console.log(`Thank you message sent to @${username} in channel ${channelId}`);
            } else {
              console.error(`Channel not found for ID: ${channelId}`);
            }
          }
        }
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
    return res.status(500).send('Internal Server Error');
  }
};
