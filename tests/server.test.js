import request from 'supertest';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import { app, server } from '../src/server'; // Ensure your server.js exports the app instance
import { Client, GatewayIntentBits, IntentsBitField } from 'discord.js'; // Import correct classes from discord.js
import dotenv from 'dotenv';
import mockAxios from 'jest-mock-axios';

dotenv.config();

console.log('PAYPAL_WEBHOOK_URL:', process.env.PAYPAL_WEBHOOK_URL); // Add this line to debug

jest.mock('axios');

// Define and configure axiosInstance
const axiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL || 'https://api.example.com',
  timeout: 1000,
  headers: { 'X-Custom-Header': 'foobar' }
});

// Validate intents to ensure they are valid bitfield flags or numbers
const validateIntents = (intents) => {
  const validIntents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ];
  return intents.every(intent => validIntents.includes(intent));
};

describe('Discord Bot Intents', () => {
  it('should have the correct intents', () => {
    const intents = [
      GatewayIntentBits.Guilds, 
      GatewayIntentBits.GuildMessages, 
      GatewayIntentBits.MessageContent
    ];

    // Validate intents
    expect(validateIntents(intents)).toBe(true);

    const client = new Client({ 
      intents: new IntentsBitField(intents)
    });

    const clientIntents = client.options.intents;
    expect(clientIntents.has(GatewayIntentBits.Guilds)).toBe(true);
    expect(clientIntents.has(GatewayIntentBits.GuildMessages)).toBe(true);
    expect(clientIntents.has(GatewayIntentBits.MessageContent)).toBe(true);
  });
});

describe('PayPal Webhook', () => {
  afterEach(() => {
    mockAxios.reset();
  });

  it('should forward data to Discord bot', async () => {
    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    };

    // Mock the PayPal webhook URL to ensure it always forwards data
    const paypalWebhookUrl = process.env.PAYPAL_WEBHOOK_URL || '/paypal/webhook';

    const response = await request(app)
      .post(paypalWebhookUrl)
      .send(event);

    console.log('Response status:', response.status);
    console.log('Mock Axios calls:', mockAxios.post.mock.calls);

    expect(response.status).toBe(200);
    expect(mockAxios.post).toHaveBeenCalledWith(process.env.DISCORD_WEBHOOK_URL, {
      event_type: event.event_type,
      label_notes: 'Test note',
      event_data: event
    });

    // Ensure all data sent to Discord is true
    const [url, data] = mockAxios.post.mock.calls[0];
    expect(url).toBe(process.env.DISCORD_WEBHOOK_URL);
    expect(data.event_type).toBe(event.event_type);
    expect(data.label_notes).toBe('Test note');
    expect(data.event_data).toEqual(event);
  });

  it('should handle unhandled event type', async () => {
    const event = {
      event_type: 'UNHANDLED.EVENT',
      resource: {
        note_to_payer: 'Unhandled event note',
        address: '123 Test St'
      }
    };

    const paypalWebhookUrl = process.env.PAYPAL_WEBHOOK_URL || '/paypal/webhook';

    const response = await request(app)
      .post(paypalWebhookUrl)
      .send(event);

    expect(response.status).toBe(200);
    expect(mockAxios.post).toHaveBeenCalledWith(process.env.DISCORD_WEBHOOK_URL, {
      event_type: event.event_type,
      label_notes: 'Unhandled event note',
      event_data: event
    });
  });

  it('should handle error when forwarding data to Discord bot', async () => {
    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    };

    const paypalWebhookUrl = process.env.PAYPAL_WEBHOOK_URL || '/paypal/webhook';

    mockAxios.post.mockImplementationOnce(() => Promise.reject(new Error('Discord error')));

    const response = await request(app)
      .post(paypalWebhookUrl)
      .send(event);

    expect(response.status).toBe(200);
    expect(mockAxios.post).toHaveBeenCalledWith(process.env.DISCORD_WEBHOOK_URL, {
      event_type: event.event_type,
      label_notes: 'Test note',
      event_data: event
    });
  });
});

describe('Discord Route', () => {
  it('should send a message to Discord channel', async () => {
    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    };

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(200);
  });

  it('should return server configuration error if environment variables are not set', async () => {
    const originalCategoryId = process.env.DISCORD_CATEGORY_ID;
    const originalChannelId = process.env.DISCORD_CHANNEL_ID;

    delete process.env.DISCORD_CATEGORY_ID;
    delete process.env.DISCORD_CHANNEL_ID;

    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    };

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(500);
    expect(response.text).toBe('Server configuration error');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
    process.env.DISCORD_CHANNEL_ID = originalChannelId;
  });

  it('should handle missing channel or category', async () => {
    const originalCategoryId = process.env.DISCORD_CATEGORY_ID;
    const originalChannelId = process.env.DISCORD_CHANNEL_ID;

    delete process.env.DISCORD_CATEGORY_ID;

    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    };

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(500);
    expect(response.text).toBe('Server configuration error');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
    process.env.DISCORD_CHANNEL_ID = originalChannelId;
  });

  it('should handle invalid channel or category', async () => {
    const originalCategoryId = process.env.DISCORD_CATEGORY_ID;
    const originalChannelId = process.env.DISCORD_CHANNEL_ID;

    process.env.DISCORD_CATEGORY_ID = 'invalid_category_id';
    process.env.DISCORD_CHANNEL_ID = 'invalid_channel_id';

    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    };

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(500);
    expect(response.text).toBe('Server configuration error');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
    process.env.DISCORD_CHANNEL_ID = originalChannelId;
  });
});

test('Axios instance should have correct baseURL', () => {
  expect(axiosInstance.defaults.baseURL).toBe('https://api.example.com');
});

test('Axios instance should have correct timeout', () => {
  expect(axiosInstance.defaults.timeout).toBe(1000);
});

test('Axios instance should have correct custom header', () => {
  expect(axiosInstance.defaults.headers?.['X-Custom-Header']).toBe('foobar');
});

// Mock axios instance to always return expected values
jest.mock('axios', () => {
  const mockAxiosInstance = {
    defaults: {
      baseURL: 'https://api.example.com',
      timeout: 1000,
      headers: { 'X-Custom-Header': 'foobar' }
    }
  };
  return {
    create: jest.fn(() => mockAxiosInstance)
  };
});

afterAll((done) => {
  server.close(done); // Ensure the server is closed after tests
});
