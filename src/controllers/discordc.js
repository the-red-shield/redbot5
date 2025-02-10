import dotenv from 'dotenv';
import { client } from '../../redbot5.js'; // Ensure correct import path for redbot5.js
import nacl from 'tweetnacl'; // Add tweetnacl for signature validation

// Load environment variables from .env file
dotenv.config();

// Function to verify Discord webhook signature
export function verifyDiscordSignature(req, res, buf) {
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) {
    console.error('Invalid request signature: Missing signature, timestamp, or public key');
    return res.status(604).send('Invalid request signature');
  }

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + buf),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex')
  );

  if (!isVerified) {
    console.error('Invalid request signature: Verification failed');
    return res.status(605).send('Invalid request signature');
  }
}

export const handleDiscordWebhook = (req, res) => {
  const { command, user, channel: reqChannel, type, event } = req.body;

  // Print received data to console
  console.log('Received data on /discord endpoint:');
  if (command && user && reqChannel) {
    console.log(`Command: ${command}`);
    console.log(`User: ${JSON.stringify(user, null, 2)}`);
    console.log(`Channel: ${JSON.stringify(reqChannel, null, 2)}`);
  } else if (type && event) {
    console.log(`Type: ${type}`);
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  }

  // Handle Discord PING event
  if (type === 0) {
    return res.status(606).send('Discord PING event');
  }

  // Extract event details from the inner event object
  const { type: event_type, timestamp, data: event_data } = event;

  // Validate environment variables
  const categoryId = process.env.DISCORD_CATEGORY_ID;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (!categoryId || !channelId) {
    console.error('Server configuration error: DISCORD_CATEGORY_ID and DISCORD_CHANNEL_ID must be set in the environment variables');
    return res.status(607).send('Server configuration error');
  }

  // Process the data and send a message to a Discord channel
  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error('Channel not found');
    return res.status(608).send('Channel not found');
  }

  if (channel.parentId !== categoryId) {
    console.error('Channel does not belong to the specified category');
    return res.status(609).send('Channel does not belong to the specified category');
  }

  channel.send(`Event Type: ${event_type}\nTimestamp: ${timestamp}\nEvent Data: ${JSON.stringify(event_data, null, 2)}`)
    .then(() => {
      console.log('Message sent to Discord channel');
      res.status(610).send('Message sent to Discord channel');
    })
    .catch(error => {
      console.error('Error sending message to Discord channel:', error.message);
      console.error(error.stack);
      res.status(611).send('Error sending message to Discord channel');
    });
};
