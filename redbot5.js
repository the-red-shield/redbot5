import express from 'express';
import bodyParser from 'body-parser';
import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js'; // Correct import for discord.js v14.17.3
import dotenv from 'dotenv';
import axios from 'axios'; // Add axios for making HTTP requests

// Load environment variables from .env file
dotenv.config();

console.log(GatewayIntentBits); // Log GatewayIntentBits to verify values
console.log('Discord Client Number:', process.env.DISCORD_CLIENT_NUMBER); // Log the fake Discord client number

const app = express();
const PORT = process.env.DISCORD_BOT_PORT || 4001; // Ensure the Discord bot runs on the correct port

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

// Store the channel ID and user username for the /buy command
const commandData = {};

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, user, channel } = interaction;

  // Store the channel ID and user username for each command
  commandData[user.username] = {
    channelId: channel.id,
    username: user.username,
    command: commandName
  };

  if (commandName === 'menu') {
    // Create a menu with 20 placeholder items and prices
    const menuItems = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}: $${(i + 1) * 10}`).join('\n');

    // Respond to the interaction with the menu
    await interaction.reply(`**Menu**\n${menuItems}`);
  } else if (commandName === 'buy') {
    // Handle the /buy command
    await interaction.reply(`Command ${commandName} received and processed.`);
  } else if (commandName === 'command3') {
    // Handle the /command3 command
    await interaction.reply(`Command ${commandName} received and processed.`);
  } else if (commandName === 'command4') {
    // Handle the /command4 command
    await interaction.reply(`Command ${commandName} received and processed.`);
  } else if (commandName === 'command5') {
    // Handle the /command5 command
    await interaction.reply(`Command ${commandName} received and processed.`);
  } else {
    try {
      // Send the data to the server for processing
      const response = await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        command: commandName,
        user: {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          tag: user.tag
        },
        channel: {
          id: channel.id,
          name: channel.name
        }
      });

      // Respond to the interaction
      await interaction.reply(`Command ${commandName} received and processed.`);
    } catch (error) {
      console.error('Error processing command:', error.message);
      await interaction.reply('There was an error processing your command.');
    }
  }
});

// Route to handle incoming data from server.js
app.post('/discord', (req, res) => {
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

// Route to handle PayPal webhooks
app.post(process.env.PAYPAL_WEBHOOK_URL, async (req, res) => {
  const { event_type, resource } = req.body;

  try {
    const labelNotes = resource && resource.note_to_payer ? resource.note_to_payer : 'No notes';

    switch (event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        console.log('Order approved:', req.body);
        console.log('Label notes:', labelNotes);

        // Check if the labelNotes contain a username
        const username = Object.keys(commandData).find(user => labelNotes.includes(user));
        if (username) {
          const { channelId, command } = commandData[username];
          const channel = client.channels.cache.get(channelId);

          if (channel) {
            channel.send(`Order approved for ${username} via command ${command}`);
          }
        }
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

export default app; // Export the app instance for testing
export { client }; // Export the client instance for use in server.js
