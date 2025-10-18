import http from 'node:http';
import { nanoid } from 'nanoid';
import { startController } from './controller';
import { createRestApp } from './restHandler';

jest.mock('./controller', () => ({
  startController: jest.fn(),
}));

const mockStartController = jest.mocked(startController);

const createControllerDouble = (
  overrides: Partial<ReturnType<typeof startController>>,
): ReturnType<typeof startController> => ({
  getByName: jest.fn().mockRejectedValue('unexpected getByName'),
  invalidateCache: jest.fn().mockRejectedValue('unexpected invalidateCache'),
  remove: jest.fn().mockRejectedValue('unexpected remove'),
  ...overrides,
});

describe('REST handler', () => {
  it('creates an item without error', async () => {
    const getByName = jest.fn().mockResolvedValue({
      id: nanoid(),
      name: 'threeve',
      description: 'A combination of three and five; simply stunning',
      ownerId: 'owner-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockStartController.mockReturnValue(createControllerDouble({ getByName }));

    const app = createRestApp();
    const server = http.createServer(app);

    await new Promise<void>((resolve) => server.listen(0, resolve));

    const serverAddress = server.address();
    if (!serverAddress || typeof serverAddress === 'string')
      throw new Error('Server failed to start');

    try {
      const response = await new Promise<{ status: number; body: string }>(
        (resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: serverAddress.port,
              path: '/words/threeve',
              method: 'GET',
            },
            (res) => {
              const chunks: Buffer[] = [];
              res.on('data', (chunk) => chunks.push(chunk as Buffer));
              res.on('end', () =>
                resolve({
                  status: res.statusCode ?? 0,
                  body: Buffer.concat(chunks).toString('utf-8'),
                }),
              );
            },
          );

          req.on('error', reject);
          req.end();
        },
      );

      expect(response.status).toBe(200);

      const data = JSON.parse(response.body);
      expect(data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'threeve',
          description: 'A combination of three and five; simply stunning',
          ownerId: 'owner-1',
        }),
      );
      expect(getByName).toHaveBeenCalledWith('threeve');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
