import { IndexController } from '../controllers/index.js';

function setRoutes(app) {
    const indexController = new IndexController();

    app.get('/', (req, res) => {
        try {
            indexController.getIndex(req, res);
        } catch (error) {
            console.error('Error in index route:', error);
            res.status(500).send('Internal Server Error');
        }
    });

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

export { setRoutes };