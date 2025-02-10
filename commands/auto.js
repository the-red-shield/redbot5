import { client } from '../redbot5.js'; // Ensure correct import path for redbot5.js

const CATEGORY_ID = '1335811004398829679'; // Category ID to monitor

client.on('channelCreate', async (channel) => {
  if (channel.type === 'GUILD_TEXT' && channel.parentId === CATEGORY_ID && channel.name.includes('ticket')) {
    console.log(`New ticket channel created: ${channel.name}`);

    try {
      // Execute the /menu command
      const menuCommand = client.application.commands.cache.find(cmd => cmd.name === 'menu');
      if (menuCommand) {
        await client.api.interactions(client.user.id, channel.id).callback.post({
          data: {
            type: 2, // Command type
            data: {
              id: menuCommand.id,
              name: menuCommand.name,
              options: []
            }
          }
        });
        console.log('Executed /menu command');
      } else {
        console.error('Menu command not found');
      }

      // Execute the /buy command
      const buyCommand = client.application.commands.cache.find(cmd => cmd.name === 'buy');
      if (buyCommand) {
        await client.api.interactions(client.user.id, channel.id).callback.post({
          data: {
            type: 2, // Command type
            data: {
              id: buyCommand.id,
              name: buyCommand.name,
              options: []
            }
          }
        });
        console.log('Executed /buy command');
      } else {
        console.error('Buy command not found');
      }
    } catch (error) {
      console.error('Error executing commands:', error.message);
    }
  }
});

export default {}; // Export an empty object to ensure the file is treated as a module
