import express from 'express';
import bodyParser from 'body-parser';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000; // Use a different port for the bot server

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Discord bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
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

  if (channel && channel.parentId === categoryId) {
    channel.send(`Event Type: ${event_type}\nLabel Notes: ${label_notes}\nEvent Data: ${JSON.stringify(event_data, null, 2)}`);
    console.log('Message sent to Discord channel');
  } else {
    console.error('Channel not found or does not belong to the specified category');
  }

  res.sendStatus(200);
});

// Start the bot server
app.listen(PORT, () => {
  console.log(`Discord bot server is running on http://localhost:${PORT}`);
});

// Log in to Discord with your app's token
client.login(process.env.DISCORD_BOT_TOKEN); // Use environment variable for bot token
