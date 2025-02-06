import request from 'supertest';
import app from './redbot5'; // Ensure your redbot5.js exports the app instance
import { Client } from 'discord.js';

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

    expect(response.status).toBe(200);
    const client = new Client();
    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    expect(channel.send).toHaveBeenCalledWith(expect.stringContaining('Event Type: CHECKOUT.ORDER.APPROVED'));
    expect(channel.send).toHaveBeenCalledWith(expect.stringContaining('Label Notes: Test note'));
  });
});
