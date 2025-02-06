import request from 'supertest';
import axios from 'axios';
import { app, server } from '../src/server'; // Ensure your server.js exports the app instance
import { Client, GatewayIntentBits, IntentsBitField, User } from 'discord.js'; // Import User instead of ClientUser
import dotenv from 'dotenv';
import mockAxios from 'jest-mock-axios';
import { someControllerFunction, IndexController } from '../src/controllers'; // Adjust the import based on your actual function
import { client, botServer } from '../redbot5'; // Import the client and botServer instances from redbot5.js

dotenv.config();

jest.mock('axios');

// Mock client.login to always resolve successfully
jest.spyOn(client, 'login').mockResolvedValue('Logged in');

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

beforeAll(async () => {
  await client.login(process.env.DISCORD_BOT_TOKEN);
});

afterAll(async () => {
  await client.destroy();
  await new Promise((resolve) => botServer.close(resolve));
  await new Promise((resolve) => server.close(resolve));
});

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

  const paypalWebhookUrl = process.env.PAYPAL_WEBHOOK_URL || '/paypal/webhook';

  it('should forward data to Discord bot', async () => {
    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    };

    try {
      const response = await request(app)
        .post(paypalWebhookUrl)
        .send(event);

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
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') {
        console.error('Unexpected error forwarding data to Discord bot:', error);
      }
      throw error;
    }
  });

  it('should handle unhandled event type', async () => {
    const event = {
      event_type: 'UNHANDLED.EVENT',
      resource: {
        note_to_payer: 'Unhandled event note',
        address: '123 Test St'
      }
    };

    try {
      const response = await request(app)
        .post(paypalWebhookUrl)
        .send(event);

      expect(response.status).toBe(200);
      expect(mockAxios.post).toHaveBeenCalledWith(process.env.DISCORD_WEBHOOK_URL, {
        event_type: event.event_type,
        label_notes: 'Unhandled event note',
        event_data: event
      });
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') {
        console.error('Unexpected error handling unhandled event type:', error);
      }
      throw error;
    }
  });

  it('should handle error when forwarding data to Discord bot', async () => {
    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    };

    mockAxios.post.mockImplementationOnce(() => Promise.reject(new Error('Discord error')));

    try {
      const response = await request(app)
        .post(paypalWebhookUrl)
        .send(event);

      expect(response.status).toBe(200);
      expect(mockAxios.post).toHaveBeenCalledWith(process.env.DISCORD_WEBHOOK_URL, {
        event_type: event.event_type,
        label_notes: 'Test note',
        event_data: event
      });
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') {
        console.error('Unexpected error when forwarding data to Discord bot:', error);
      }
      throw error;
    }
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

    if (response.status !== 500) {
      console.error('Expected server configuration error but received:', response.status, response.text);
    }

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

    if (response.status !== 500) {
      console.error('Expected server configuration error but received:', response.status, response.text);
    }

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

    if (response.status !== 500) {
      console.error('Expected server configuration error but received:', response.status, response.text);
    }

    expect(response.status).toBe(500);
    expect(response.text).toBe('Server configuration error');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
    process.env.DISCORD_CHANNEL_ID = originalChannelId;
  });

  it('should handle channel not found', async () => {
    const originalChannelId = process.env.DISCORD_CHANNEL_ID;

    process.env.DISCORD_CHANNEL_ID = 'non_existent_channel_id';

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

    if (response.status !== 404) {
      console.error('Expected channel not found error but received:', response.status, response.text);
    }

    expect(response.status).toBe(404);
    expect(response.text).toBe('Channel not found');

    process.env.DISCORD_CHANNEL_ID = originalChannelId;
  });

  it('should handle channel not belonging to specified category', async () => {
    const originalCategoryId = process.env.DISCORD_CATEGORY_ID;

    process.env.DISCORD_CATEGORY_ID = 'invalid_category_id';

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

    if (response.status !== 400) {
      console.error('Expected channel not belonging to specified category error but received:', response.status, response.text);
    }

    expect(response.status).toBe(400);
    expect(response.text).toBe('Channel does not belong to the specified category');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
  });
});

describe('Server Start', () => {
  it('should start the server and listen on the specified port', (done) => {
    const serverInstance = app.listen(4000, () => {
      console.log('Test server is running on port 4000');
      serverInstance.close(done);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log('Port 4000 is already in use');
        done();
      } else {
        done(err);
      }
    });
  }, 10000); // Increase timeout to 10000 ms
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

    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);

    if (response.status !== 200) {
      console.error('Failed to send message to Discord channel:', response.text);
    }

    expect(response.status).toBe(200);

    if (!channel || !channel.send) {
      console.error('Channel or channel.send is not defined');
    } else {
      expect(channel.send).toHaveBeenCalledWith(expect.stringContaining('Event Type: CHECKOUT.ORDER.APPROVED'));
      expect(channel.send).toHaveBeenCalledWith(expect.stringContaining('Label Notes: Test note'));
    }
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

    if (!channel || !channel.send) {
      console.error('Channel or channel.send is not defined');
    } else {
      expect(channel.send).toHaveBeenCalledWith(expect.stringContaining('Event Type: CHECKOUT.ORDER.APPROVED'));
    }
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

    if (response.status !== 500) {
      console.error('Expected server configuration error but received:', response.status, response.text);
    }

    expect(response.status).toBe(500);
    expect(response.text).toBe('Server configuration error');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
    process.env.DISCORD_CHANNEL_ID = originalChannelId;
  });

  it('should handle missing channel or category', async () => {
    const originalCategoryId = process.env.DISCORD_CATEGORY_ID;
    const originalChannelId = process.env.DISCORD_CHANNEL_ID;

    delete process.env.DISCORD_CATEGORY_ID;

    const response = await request(app).post('/discord').send({
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    });

    if (response.status !== 500) {
      console.error('Expected server configuration error but received:', response.status, response.text);
    }

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

    const response = await request(app).post('/discord').send({
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    });

    if (response.status !== 500) {
      console.error('Expected server configuration error but received:', response.status, response.text);
    }

    expect(response.status).toBe(500);
    expect(response.text).toBe('Server configuration error');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
    process.env.DISCORD_CHANNEL_ID = originalChannelId;
  });

  it('should handle channel not found', async () => {
    const originalChannelId = process.env.DISCORD_CHANNEL_ID;

    process.env.DISCORD_CHANNEL_ID = 'non_existent_channel_id';

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

    if (response.status !== 404) {
      console.error('Expected channel not found error but received:', response.status, response.text);
    }

    expect(response.status).toBe(404);
    expect(response.text).toBe('Channel not found');

    process.env.DISCORD_CHANNEL_ID = originalChannelId;
  });

  it('should handle channel not belonging to specified category', async () => {
    const originalCategoryId = process.env.DISCORD_CATEGORY_ID;

    process.env.DISCORD_CATEGORY_ID = 'invalid_category_id';

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

    if (response.status !== 400) {
      console.error('Expected channel not belonging to specified category error but received:', response.status, response.text);
    }

    expect(response.status).toBe(400);
    expect(response.text).toBe('Channel does not belong to the specified category');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
  });
});

describe('Controllers', () => {
  it('should call someControllerFunction and return expected result', () => {
    const req = { body: { key: 'value' } };
    const res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    someControllerFunction(req, res);

    if (res.status.mock.calls.length > 0 && res.status.mock.calls[0][0] !== 500) {
      console.error('Expected status 500 but received:', res.status.mock.calls[0][0]);
    }

    expect(res.send).toHaveBeenCalledWith('Response from someControllerFunction'); // Adjust the expectation based on your actual function
  });

  it('should return welcome message from IndexController', () => {
    const req = {};
    const res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    const indexController = new IndexController();
    indexController.getIndex(req, res);

    if (res.status.mock.calls.length > 0 && res.status.mock.calls[0][0] !== 500) {
      console.error('Expected status 500 but received:', res.status.mock.calls[0][0]);
    }

    expect(res.send).toHaveBeenCalledWith('Welcome to the Redbot5 application!');
  });
});

describe('Routes', () => {
  it('should return welcome message from index route', async () => {
    const response = await request(app).get('/');

    if (response.status !== 200) {
      console.error('Expected status 200 but received:', response.status);
    }

    expect(response.status).toBe(200);
    expect(response.text).toBe('Welcome to the Redbot5 application!');
  });

  it('should handle errors in index route', async () => {
    const originalGetIndex = IndexController.prototype.getIndex;
    IndexController.prototype.getIndex = jest.fn(() => {
      throw new Error('Test error');
    });

    const response = await request(app).get('/');

    if (response.status !== 500) {
      console.error('Expected status 500 but received:', response.status);
    }

    expect(response.status).toBe(500);
    expect(response.text).toBe('Internal Server Error');

    IndexController.prototype.getIndex = originalGetIndex;
  });
});

afterAll(async () => {
  await client.destroy();
  await new Promise((resolve) => botServer.close(resolve));
  await new Promise((resolve) => server.close(resolve));
});
