class IndexController {
    getIndex(req, res) {
        res.send('Welcome to the Redbot5 application!');
    }
}

export const someControllerFunction = (req, res) => {
  // ...existing code...
  res.send('Response from someControllerFunction');
  // ...existing code...
};

export default IndexController;