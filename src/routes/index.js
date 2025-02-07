import express from 'express';
import { IndexController, handlePaypalWebhook } from '../controllers/index.js';

const router = express.Router();

export function setRoutes(app) {
    const indexController = new IndexController();

    app.get('/', (req, res) => {
        try {
            indexController.getIndex(req, res);
        } catch (error) {
            console.error('Error in index route:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    // Ensure the PayPal webhook route is correctly set
    app.post(process.env.PAYPAL_WEBHOOK_URL || '/paypal/webhook', handlePaypalWebhook);

    // Add more routes as needed
    // app.get('/another-route', (req, res) => {
    //     try {
    //         indexController.anotherMethod(req, res);
    //     } catch (error) {
    //         console.error('Error in another route:', error);
    //         res.status(500).send('Internal Server Error');
    //     }
    // });
}

export default router;