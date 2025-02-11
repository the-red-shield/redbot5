import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios'; // Add axios for making HTTP requests
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { commands } from './commands/list.js'; // Import commands from list.js
import { Client, GatewayIntentBits, IntentsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'; // Correct import for discord.js v14.17.3
import { setupAutoCommands } from './commands/auto.js'; // Import the setupAutoCommands function

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001; // Use the PORT environment variable provided by Heroku

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate environment variables
if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CATEGORY_ID || !process.env.DISCORD_CHANNEL_ID) {
  console.error('DISCORD_BOT_TOKEN, DISCORD_CATEGORY_ID, and DISCORD_CHANNEL_ID must be set in the environment variables');
  process.exit(301);
}

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_GUILD_ID) {
  console.error('DISCORD_CLIENT_ID and DISCORD_GUILD_ID must be set in the environment variables');
  process.exit(302);
}

const useWebhooks = process.env.LIVE_HOOKS === 'true'; // Add a flag to control webhook usage

// Initialize Discord bot
const client = new Client({ 
  intents: new IntentsBitField([
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ])
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Register commands
  const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error reloading application (/) commands:', error);
    process.exit(303);
  }

  setupAutoCommands(); // Set up the auto commands after the client is ready
});

client.on('error', (error) => {
  console.error('Discord client error:', error.message);
  process.exit(304);
});

// Store the channel ID and user username for the /buy command
const commandData = {};

// Centralized error handling for interactionCreate event
client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isCommand()) return;

    const { commandName, user, channel } = interaction;

    // Store the channel ID and user username for each command
    if (commandName === 'buy') {
      commandData[user.username] = {
        channelId: channel.id,
        username: user.username
      };

      // Create and send an embedded button link
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Pay Now')
            .setStyle(ButtonStyle.Link)
            .setURL(process.env.PAYPAL_PAYMENT_LINK)
        );

      await interaction.reply({
        content: 'Click the button below to proceed with the payment:',
        components: [row]
      });
      return; // Ensure no further replies are sent for this interaction
    }

    if (useWebhooks) {
      // Send the data to the server for processing
      const response = await axios.post(process.env.DISCORD_SERVER_HOOK, { // Use DISCORD_SERVER_HOOK
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
      console.log(`Data sent to server: ${JSON.stringify(response.data, null, 2)}`);

      // Send data to DISCORD_WEBHOOK_URL (Heroku listener)
      await axios.post(process.env.DISCORD_WEBHOOK_URL, {
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
    }

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
      await interaction.reply(`Command ${commandName} received and processed.`);
    }
  } catch (error) {
    console.error('Error handling interaction:', error.message);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ content: 'Error handling interaction', flags: 64 }); // Use flags instead of ephemeral
    }
  }
});

import './commands/auto.js'; // Import the auto.js file to ensure it is executed

export default app; // Export the app instance for testing
export { client, commandData }; // Export the client and commandData instances for use in other files

// Additional logging for client initialization
console.log('Client initialized with intents:', client.options.intents);
console.log('DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? 'Token is set' : 'Token is not set');
console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? 'Client ID is set' : 'Client ID is not set');
console.log('DISCORD_GUILD_ID:', process.env.DISCORD_GUILD_ID ? 'Guild ID is set' : 'Guild ID is not set');
