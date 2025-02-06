import { someControllerFunction } from '../src/controllers'; // Adjust the import based on your actual function

describe('Controllers', () => {
  it('should call someControllerFunction and return expected result', () => {
    const req = { body: { key: 'value' } };
    const res = {
      send: jest.fn()
    };

    someControllerFunction(req, res);

    expect(res.send).toHaveBeenCalledWith(expect.anything()); // Adjust the expectation based on your actual function
  });
});
