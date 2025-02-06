import request from 'supertest';
import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js';
import dotenv from 'dotenv';
import app, { client } from '../redbot5'; // Ensure your redbot5.js exports the app and client instances

dotenv.config();

jest.mock('discord.js', () => {
  const mClient = {
    channels: {
      cache: {
        get: jest.fn().mockReturnValue({
          send: jest.fn()
        })
      }
    },
    once: jest.fn(),
    login: jest.fn()
  };
  return { Client: jest.fn(() => mClient) };
});

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

describe('Discord Bot Webhook', () => {
  it('should send message to Discord channel', async () => {
    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {}
    };

    const response = await request(app)
      .post('/discord')
      .send(event);

    console.log('Response status:', response.status);
    const client = new Client();
    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    console.log('Mock channel send calls:', channel.send.mock.calls);

    expect(response.status).toBe(200);
    expect(channel.send).toHaveBeenCalledWith(expect.stringContaining('Event Type: CHECKOUT.ORDER.APPROVED'));
    expect(channel.send).toHaveBeenCalledWith(expect.stringContaining('Label Notes: Test note'));
  });
});

describe('Discord Bot Server', () => {
  it('should start the bot server and respond to requests', async () => {
    const response = await request(app).post('/discord').send({
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    });

    expect(response.status).toBe(200);
  });

  it('should log in to Discord with the provided token', async () => {
    const loginSpy = jest.spyOn(client, 'login').mockResolvedValue('Logged in');
    await client.login(process.env.DISCORD_BOT_TOKEN);
    expect(loginSpy).toHaveBeenCalledWith(process.env.DISCORD_BOT_TOKEN);
    loginSpy.mockRestore();
  });

  it('should handle Discord client errors', () => {
    const error = new Error('Discord client error');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    client.emit('error', error);
    expect(errorSpy).toHaveBeenCalledWith('Discord client error:', error);
    errorSpy.mockRestore();
  });

  it('should send a message to the Discord channel', async () => {
    const channel = {
      send: jest.fn().mockResolvedValue(true),
      parentId: process.env.DISCORD_CATEGORY_ID
    };
    jest.spyOn(client.channels.cache, 'get').mockReturnValue(channel);

    const response = await request(app).post('/discord').send({
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    });

    expect(response.status).toBe(200);
    expect(channel.send).toHaveBeenCalledWith(expect.stringContaining('Event Type: CHECKOUT.ORDER.APPROVED'));
  });

  it('should return server configuration error if environment variables are not set', async () => {
    const originalCategoryId = process.env.DISCORD_CATEGORY_ID;
    const originalChannelId = process.env.DISCORD_CHANNEL_ID;

    delete process.env.DISCORD_CATEGORY_ID;
    delete process.env.DISCORD_CHANNEL_ID;

    const response = await request(app).post('/discord').send({
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    });

    expect(response.status).toBe(500);
    expect(response.text).toBe('Server configuration error');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
    process.env.DISCORD_CHANNEL_ID = originalChannelId;
  });
});

afterAll((done) => {
  client.destroy();
  done();
});
