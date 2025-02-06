import request from 'supertest';
import axios from 'axios';
import { app, server } from '../src/server'; // Ensure your server.js exports the app instance
import dotenv from 'dotenv';
import mockAxios from 'jest-mock-axios';
import { someControllerFunction, IndexController } from '../src/controllers'; // Adjust the import based on your actual function
import { client, botServer } from '../redbot5'; // Import the client and botServer instances from '../redbot5.js'

// Load environment variables from .env file
dotenv.config();

jest.mock('axios', () => {
  const mockAxiosInstance = {
      defaults:  {	
          baseURL:  process.env.API_BASE_URL || 'https://api.example.com',
          timeout:  1000,
          headers:  {  'X-Custom-Header':  'foobar'  }
      }
  };
  return {
     create:  jest.fn(() => mockAxiosInstance)
  };
});

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
    mockGatewayIntentBits.Guilds,
    mockGatewayIntentBits.GuildMessages,
    mockGatewayIntentBits.MessageContent
  ];
  return intents.every(intent => validIntents.includes(intent));
};

jest.mock('discord.js', () => {
  const actualDiscord = jest.requireActual('discord.js');
  const mockGatewayIntentBits = {
    Guilds: 1,
    GuildMessages: 512,
    MessageContent: 32768
  };
  const mockIntentsBitField = jest.fn().mockImplementation((intents) => ({
    has: jest.fn((intent) => intents.includes(intent))
  }));
  return {
    ...actualDiscord,
    Client: jest.fn().mockImplementation(() => ({
      login: jest.fn().mockResolvedValue('Logged in'),
      destroy: jest.fn().mockResolvedValue(),
      on: jest.fn(),
      once: jest.fn(),
      channels: {
        cache: {
          get: jest.fn().mockReturnValue({
            send: jest.fn().mockResolvedValue(true),
            parentId: process.env.DISCORD_CATEGORY_ID
          })
        }
      },
      user: {
        tag: 'test-user#1234'
      },
      options: {
        intents: new mockIntentsBitField([
          mockGatewayIntentBits.Guilds,
          mockGatewayIntentBits.GuildMessages,
          mockGatewayIntentBits.MessageContent
        ])
      }
    })),
    GatewayIntentBits: mockGatewayIntentBits,
    IntentsBitField: mockIntentsBitField
  };
});

beforeAll(async () => {
  // Validate environment variables
  if (!process.env.PAYPAL_WEBHOOK_URL || !process.env.DISCORD_WEBHOOK_URL || !process.env.DISCORD_CATEGORY_ID || !process.env.DISCORD_CHANNEL_ID) {
    throw new Error('PAYPAL_WEBHOOK_URL, DISCORD_WEBHOOK_URL, DISCORD_CATEGORY_ID, and DISCORD_CHANNEL_ID must be set in the environment variables');
  }

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
      mockGatewayIntentBits.Guilds, 
      mockGatewayIntentBits.GuildMessages, 
      mockGatewayIntentBits.MessageContent
    ];

    // Validate intents
    expect(validateIntents(intents)).toBe(true);

    const client = new Client({ 
      intents: new IntentsBitField(intents)
    });

    const clientIntents = client.options.intents;
    expect(clientIntents.has(mockGatewayIntentBits.Guilds)).toBe(true);
    expect(clientIntents.has(mockGatewayIntentBits.GuildMessages)).toBe(true);
    expect(clientIntents.has(mockGatewayIntentBits.MessageContent)).toBe(true);
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

    const expectedStatus = 200;

    const response = await request(app)
      .post(paypalWebhookUrl)
      .send(event);

    expect(response.status).toBe(expectedStatus);
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

    const expectedStatus = 200;

    const response = await request(app)
      .post(paypalWebhookUrl)
      .send(event);

    expect(response.status).toBe(expectedStatus);
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

    const expectedStatus = 200;

    mockAxios.post.mockImplementationOnce(() => Promise.reject(new Error('Discord error')));

    const response = await request(app)
      .post(paypalWebhookUrl)
      .send(event);

    expect(response.status).toBe(expectedStatus);
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

    const expectedStatus = 200;

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(expectedStatus);
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

    const expectedStatus = 500;

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(expectedStatus);
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

    const expectedStatus = 500;

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(expectedStatus);
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

    const expectedStatus = 500;

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(expectedStatus);
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

    const expectedStatus = 404;

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(expectedStatus);
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

    const expectedStatus = 400;

    const response = await request(app)
      .post('/discord')
      .send(event);

    expect(response.status).toBe(expectedStatus);
    expect(response.text).toBe('Channel does not belong to the specified category');

    process.env.DISCORD_CATEGORY_ID = originalCategoryId;
  });
});

describe('Server Start', () => {
  it('should start the server and listen on the specified port', (done) => {
    const expectedStatus = 200;

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
  const expectedBaseURL = 'https://api.example.com';
  expect(axiosInstance.defaults.baseURL).toBe(expectedBaseURL);
});

test('Axios instance should have correct timeout', () => {
  const expectedTimeout = 1000;
  expect(axiosInstance.defaults.timeout).toBe(expectedTimeout);
});

test('Axios instance should have correct custom header', () => {
  const expectedHeader = 'foobar';
  expect(axiosInstance.defaults.headers?.['X-Custom-Header']).toBe(expectedHeader);
});

describe('Controllers', () => {
  it('should call someControllerFunction and return expected result', () => {
    const req = { body: { key: 'value' } };
    const res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    const expectedStatus = 200;

    someControllerFunction(req, res);

    if (res.status.mock.calls.length > 0 && res.status.mock.calls[0][0] !== expectedStatus) {
      console.error('Expected status 200 but received:', res.status.mock.calls[0][0]);
    }

    expect(res.send).toHaveBeenCalledWith('Response from someControllerFunction'); // Adjust the expectation based on your actual function
  });

  it('should return welcome message from IndexController', () => {
    const req = {};
    const res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    const expectedStatus = 200;

    const indexController = new IndexController();
    indexController.getIndex(req, res);

    expect(res.send).toHaveBeenCalledWith('Welcome to the Redbot5 application!');
  });
});

describe('Routes', () => {
  it('should return welcome message from index route', async () => {
    const expectedStatus = 200;

    const response = await request(app).get('/');

    if (response.status !== expectedStatus) {
      console.error('Expected status 200 but received:', response.status);
    }

    expect(response.status).toBe(expectedStatus);
    expect(response.text).toBe('Welcome to the Redbot5 application!');
  });

  it('should handle errors in index route', async () => {
    const req = {};
    const res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    const expectedStatus = 500;

    const indexController = new IndexController();
    indexController.getIndex(req, res);

    IndexController.prototype.getIndex = jest.fn(() => {
      throw new Error('Test error');
    });

    const response = await request(app).get('/');

    if (response.status !== expectedStatus) {
      console.error('Expected status 500 but received:', response.status);
    }

    expect(response.status).toBe(expectedStatus);
    expect(response.text).toBe('Internal Server Error');

    IndexController.prototype.getIndex = originalGetIndex;
  });
});

afterAll(async () => {
  await client.destroy();
  await new Promise((resolve) => botServer.close(resolve));
  await new Promise((resolve) => server.close(resolve));
});
