import IndexController from '../controllers/index.js';

function setRoutes(app) {
    const indexController = new IndexController();

    app.get('/', indexController.getIndex.bind(indexController));
}

export { setRoutes };