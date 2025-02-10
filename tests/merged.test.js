import request from 'supertest';
import { app } from '../src/server'; // Ensure your server.js exports the app instance
import dotenv from 'dotenv';
import mockAxios from 'jest-mock-axios';
import { client } from '../redbot5'; // Import the client instance from '../redbot5.js'
import { setRoutes } from '../src/routes/index.js'; // Import the setRoutes function

// Load environment variables from .env file
dotenv.config();

jest.mock('axios', () => {
  const mockAxiosInstance = {
      post: jest.fn()
  };
  return {
     create: jest.fn(() => mockAxiosInstance),
     post: mockAxiosInstance.post
  };
});

// Mock client.login to always resolve successfully
jest.spyOn(client, 'login').mockResolvedValue('Logged in');

jest.mock('discord.js', () => {
  const actualDiscord = jest.requireActual('discord.js');
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
            send: jest.fn().mockResolvedValue(true)
          })
        }
      },
      user: {
        tag: 'test-user#1234'
      }
    }))
  };
});

let testServer;

beforeAll(async () => {
  // Set up routes before running tests
  setRoutes(app);

  await client.login(process.env.DISCORD_BOT_TOKEN);

  // Start the test server on a test-specific port
  const port = 4000; // Use a test-specific port
  testServer = app.listen(port, () => {
    console.log(`Test server is running on port ${port}`);
  });
});

afterAll(async () => {
  await client.destroy();
  await new Promise((resolve) => testServer.close(resolve)); // Ensure testServer is correctly closed
});

const resetMockAxiosHandlers = () => {
  mockAxios.reset();
};

describe('PayPal Webhook', () => {
  afterEach(() => {
    resetMockAxiosHandlers();
  });

  const paypalWebhookUrl = process.env.PAYPAL_WEBHOOK_URL || '/paypal/webhook';

  const sendWebhookRequest = async (event) => {
    return await request(app)
      .post(paypalWebhookUrl)
      .send(event);
  };

  const verifyDiscordPost = (expectedUrl, expectedPayload) => {
    expect(mockAxios.post).toHaveBeenCalledWith(expectedUrl, expectedPayload);
  };

  const webhookEvents = [
    {
      event: {
        event_type: 'CHECKOUT.ORDER.APPROVED',
        label_notes: 'Test note',
        event_data: {
          note_to_payer: 'Test note',
          address: '123 Test St'
        }
      },
      expectedPayload: {
        event_type: 'CHECKOUT.ORDER.APPROVED',
        label_notes: 'Test note',
        event_data: {
          note_to_payer: 'Test note',
          address: '123 Test St'
        }
      }
    },
    {
      event: {
        event_type: 'PAYMENT.SALE.COMPLETED',
        label_notes: 'Test note',
        event_data: {
          note_to_payer: 'Test note',
          address: '123 Test St'
        }
      },
      expectedPayload: {
        event_type: 'PAYMENT.SALE.COMPLETED',
        label_notes: 'Test note',
        event_data: {
          note_to_payer: 'Test note',
          address: '123 Test St'
        }
      }
    },
    {
      event: {
        event_type: 'UNHANDLED.EVENT',
        resource: {
          note_to_payer: 'Unhandled event note',
          address: '123 Test St'
        }
      },
      expectedPayload: {
        event_type: 'UNHANDLED.EVENT',
        label_notes: 'Unhandled event note',
        event_data: {
          event_type: 'UNHANDLED.EVENT',
          resource: {
            note_to_payer: 'Unhandled event note',
            address: '123 Test St'
          }
        }
      }
    }
  ];

  webhookEvents.forEach(({ event, expectedPayload }) => {
    it(`should forward ${event.event_type} event to Discord bot`, async () => {
      const response = await sendWebhookRequest(event);

      expect(response.status).toBe(200);

      const expectedUrl = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/test';
      verifyDiscordPost(expectedUrl, expectedPayload);
    });
  });

  it('should handle error when forwarding data to Discord bot', async () => {
    const event = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      label_notes: 'Test note',
      event_data: {
        note_to_payer: 'Test note',
        address: '123 Test St'
      }
    };

    mockAxios.post.mockRejectedValue(new Error('Discord API error'));

    const response = await sendWebhookRequest(event);

    expect(response.status).toBe(500);
  });
});

describe('Discord Commands', () => {
  const sendCommandRequest = async (command) => {
    return await request(app)
      .post('/discord')
      .send(command);
  };

  const commands = [
    { name: 'menu', expectedResponse: '**Menu**' },
    { name: 'buy', expectedResponse: 'Command buy received and processed.' },
    { name: 'command3', expectedResponse: 'Command command3 received and processed.' },
    { name: 'command4', expectedResponse: 'Command command4 received and processed.' },
    { name: 'command5', expectedResponse: 'Command command5 received and processed.' }
  ];

  commands.forEach(({ name, expectedResponse }) => {
    it(`should handle /${name} command`, async () => {
      const command = {
        type: 1,
        event: {
          type: 'COMMAND',
          timestamp: Date.now(),
          data: {
            name
          }
        }
      };

      const response = await sendCommandRequest(command);

      expect(response.status).toBe(200);
      expect(response.text).toContain(expectedResponse);
    });
  });
});
