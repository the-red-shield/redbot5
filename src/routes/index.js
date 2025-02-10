import express from 'express';
import { IndexController } from '../controllers/index.js'; // Import the IndexController
import { handlePaypalWebhook } from '../controllers/paypalc.js'; // Import the PayPal webhook handler
import { handleDiscordWebhook } from '../controllers/discordc.js'; // Import the Discord webhook handler

const router = express.Router();

export function setRoutes(app) {
    const indexController = new IndexController();

    app.get('/', (req, res) => {
        try {
            indexController.getIndex(req, res);
        } catch (error) {
            console.error('Error in index route:', error);
            res.status(612).send('Internal Server Error');
        }
    });

    // Ensure the PayPal webhook route is correctly set
    app.post(process.env.PAYPAL_WEBHOOK_URL || '/paypal/webhook', (req, res) => {
        try {
            handlePaypalWebhook(req, res);
        } catch (error) {
            console.error('Error in PayPal webhook route:', error);
            res.status(613).send('Internal Server Error');
        }
    });

    // Ensure the Discord webhook route is correctly set
    app.post(process.env.DISCORD_WEBHOOK_URL || '/discord', (req, res) => {
        try {
            handleDiscordWebhook(req, res);
        } catch (error) {
            console.error('Error in Discord webhook route:', error);
            res.status(614).send('Internal Server Error');
        }
    });

    // Add more routes as needed
    // app.get('/another-route', (req, res) => {
    //     try {
    //         indexController.anotherMethod(req, res);
    //     } catch (error) {
    //         console.error('Error in another route:', error);
    //         res.status(615).send('Internal Server Error');
    //     }
    // });
}

export default router;