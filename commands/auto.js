import { client } from '../redbot5.js'; // Ensure correct import path for redbot5.js
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js'; // Import necessary components
import dotenv from 'dotenv'; // Import dotenv to load environment variables

dotenv.config(); // Load environment variables

const CATEGORY_ID = '1335811004398829679'; // Category ID to monitor

export function setupAutoCommands() {
  console.log('Waiting for autocommands'); // Add logging to indicate setup

  client.on('channelCreate', async (channel) => {
    console.log(`Channel created: ${channel.name} (ID: ${channel.id})`); // Log channel creation

    if (channel.type === ChannelType.GuildText && channel.parentId === CATEGORY_ID && channel.name.includes('ticket')) {
      console.log(`New ticket channel detected: ${channel.name}`);

      try {
        // Execute the /menu command
        const menuItems = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}: $${(i + 1) * 10}`).join('\n');
        await channel.send(`**Menu**\n${menuItems}`);
        console.log('Executed /menu command');

        // Execute the /buy command
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Pay Now')
              .setStyle(ButtonStyle.Link)
              .setURL(process.env.PAYPAL_PAYMENT_LINK)
          );

        await channel.send({
          content: 'Click the button below to proceed with the payment:',
          components: [row]
        });
        console.log('Executed /buy command');
      } catch (error) {
        console.error('Error executing commands:', error.message);
      }
    }
  });

  console.log('Autocommand executed'); // Add logging to indicate setup completion
}

export default {}; // Export an empty object to ensure the file is treated as a module
