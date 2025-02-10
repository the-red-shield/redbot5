import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Brings you to payment page')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user who initiated the command')
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel where the command was activated')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Displays the current menu')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user who initiated the command')
        .setRequired(false))
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel where the command was activated')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('command3')
    .setDescription('Placeholder command 3')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user who initiated the command')
        .setRequired(false))
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel where the command was activated')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('command4')
    .setDescription('Placeholder command 4')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user who initiated the command')
        .setRequired(false))
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel where the command was activated')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('command5')
    .setDescription('Placeholder command 5')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user who initiated the command')
        .setRequired(false))
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel where the command was activated')
        .setRequired(false))
].map(command => command.toJSON());

export { commands };

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error reloading application (/) commands:', error);
    process.exit(606);
  }
})();
