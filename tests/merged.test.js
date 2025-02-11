import request from 'supertest';
import { app, server } from '../src/server.js'; // Ensure your server.js exports the app and server instances
import dotenv from 'dotenv';
import { client } from '../redbot5.js'; // Import the client instance from '../redbot5.js'

// Load environment variables from .env file
dotenv.config();

// Mock client.login to always resolve successfully
jest.spyOn(client, 'login').mockResolvedValue('Logged in');

jest.mock('axios', () => {
  return {
    post: jest.fn()
  };
});

// Mock console.log to prevent actual logging during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

beforeAll(async () => {
  // Mock environment variables
  process.env.PAYPAL_WEBHOOK_URL = '/paypal/webhook';
  process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
  process.env.DISCORD_CATEGORY_ID = 'test-category-id';
  process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
  process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
  process.env.PAYPAL_CLIENT_ID = 'test-client-id';
  process.env.PAYPAL_CLIENT_SECRET = 'test-client-secret';

  await client.login(process.env.DISCORD_BOT_TOKEN);
});

afterAll(async () => {
  await client.destroy();
  server.close(); // Ensure the server is closed after tests
});

describe('Welcome to the Redbot5 application!', () => {
  it('should return Welcome to the Redbot5 application!', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Welcome to the Redbot5 application!');
  });
});

// Ensure the server is closed after all tests
afterAll(() => {
  server.close();
});
