import express from 'express';
import bodyParser from 'body-parser';
import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js'; // Correct import for discord.js v14.17.3
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

console.log(GatewayIntentBits); // Log GatewayIntentBits to verify values

const app = express();
const PORT = process.env.DISCORD_BOT_PORT || 4001; // Change the port to 4001

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Validate environment variables
if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CATEGORY_ID || !process.env.DISCORD_CHANNEL_ID) {
  console.error('DISCORD_BOT_TOKEN, DISCORD_CATEGORY_ID, and DISCORD_CHANNEL_ID must be set in the environment variables');
  process.exit(1);
}

// Initialize Discord bot
const client = new Client({ 
  intents: new IntentsBitField([
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ])
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('error', (error) => {
  console.error('Discord client error:', error.message);
  console.error(error.stack);
});

// Route to handle incoming data from server.js
app.post('/discord', (req, res) => {
  const { event_type, label_notes, event_data } = req.body;

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
    return res.status(200).send('Channel not found');
  }

  if (channel.parentId !== categoryId) {
    console.error('Channel does not belong to the specified category');
    return res.status(200).send('Channel does not belong to the specified category');
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

// Start the bot server
const botServer = app.listen(PORT, () => {
  console.log(`Discord bot server is running on http://localhost:${PORT}`);
});

// Log in to Discord with your app's token
client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
  console.error('Error logging in to Discord:', error.message);
  console.error(error.stack);
}); // Use environment variable for bot token

export default app; // Export the app instance for testing
export { client, botServer }; // Export the client and bot server instances for use in server.js
