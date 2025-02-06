import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js';
import dotenv from 'dotenv';
import app from '../redbot5.js';

dotenv.config();

describe('Discord Bot Intents', () => {
  it('should have the correct intents', () => {
    const client = new Client({ 
      intents: new IntentsBitField([
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
      ])
    });

    const intents = client.options.intents;
    expect(intents.has(GatewayIntentBits.Guilds)).toBe(true);
    expect(intents.has(GatewayIntentBits.GuildMessages)).toBe(true);
    expect(intents.has(GatewayIntentBits.MessageContent)).toBe(true);
  });
});
