import express from 'express';
import bodyParser from 'body-parser';
import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js'; // Correct import for discord.js v14.17.3
import dotenv from 'dotenv';
import axios from 'axios'; // Add axios for making HTTP requests
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { commands } from './commands/list.js'; // Import commands from list.js

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

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_GUILD_ID) {
  console.error('DISCORD_CLIENT_ID and DISCORD_GUILD_ID must be set in the environment variables');
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
  }
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

  // Send the data to the server for processing
  try {
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
    console.log(`Data sent to server: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error) {
    console.error('Error sending data to server:', error.message);
    return interaction.reply({ content: 'Error sending data to server', ephemeral: true });
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
});

export default app; // Export the app instance for testing
export { client }; // Export the client instance for use in server.js
