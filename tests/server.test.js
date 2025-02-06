import request from 'supertest';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import app, { server } from '../src/server'; // Ensure your server.js exports the app instance
import { Client } from 'discord.js'; // Import only Client from discord.js
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

// Manually define GatewayIntentBits and IntentsBitField
const GatewayIntentBits = {
  Guilds: 1,
  GuildMessages: 512,
  MessageContent: 32768
};

class IntentsBitField {
  constructor(intents) {
    this.intents = new Set(intents);
  }

  has(intent) {
    return this.intents.has(intent);
  }
}

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

describe('PayPal Webhook', () => {
  afterEach(() => {
    mockAxios.reset();
  });

  it('should forward data to Discord bot', async () => {
    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: {
        note_to_payer: 'Test note'
      }
    };

    const response = await request(app)
      .post(process.env.PAYPAL_WEBHOOK_URL)
      .send(event);

    console.log('Response status:', response.status);
    console.log('Mock Axios calls:', mockAxios.post.mock.calls);

    expect(response.status).toBe(200);
    expect(mockAxios.post).toHaveBeenCalledWith(process.env.DISCORD_WEBHOOK_URL, {
      event_type: event.event_type,
      label_notes: 'Test note',
      event_data: event
    });
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

afterAll((done) => {
    server.close(done); // Ensure the server is closed after tests
});
