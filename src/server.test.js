import request from 'supertest';
import app from './server'; // Ensure your server.js exports the app instance
import mockAxios from 'jest-mock-axios';
import axiosInstance from '../lib/axios.js'; // Ensure this path is correct

jest.mock('axios');

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
  expect(axiosInstance.defaults.headers['X-Custom-Header']).toBe('foobar');
});
