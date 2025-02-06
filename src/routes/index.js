import IndexController from '../controllers/index.js';

function setRoutes(app) {
    const indexController = new IndexController();

    app.get('/', indexController.getIndex.bind(indexController));
    // Add more routes as needed
    // app.get('/another-route', indexController.anotherMethod.bind(indexController));
}

export { setRoutes };