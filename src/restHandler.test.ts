import http from 'node:http';
import { nanoid } from 'nanoid';
import { startController } from './controller';
import { createRestApp } from './restHandler';
import env from './env';

jest.mock('./controller', () => ({
  startController: jest.fn(),
}));

const mockStartController = jest.mocked(startController);

const createControllerDouble = (
  overrides: Partial<ReturnType<typeof startController>>,
): ReturnType<typeof startController> => ({
  countAll: jest.fn().mockRejectedValue('unexpected countAll'),
  getByName: jest.fn().mockRejectedValue('unexpected getByName'),
  invalidateCache: jest.fn().mockRejectedValue('unexpected invalidateCache'),
  remove: jest.fn().mockRejectedValue('unexpected remove'),
  ...overrides,
});

describe('REST handler', () => {
  it('creates an item with deduped links', async () => {
    const timestamp = Date.now();
    const getByName = jest.fn().mockResolvedValue({
      id: nanoid(),
      name: 'threeve',
      cacheExpiryDate: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      associations: [
        {
          associationType: 'Datamuse: means like',
          matches: [{ word: 'alpha', score: 42 }, { word: 'beta' }],
        },
        {
          associationType: 'Datamuse: opposite of',
          matches: [{ word: 'alpha', score: 13 }],
        },
      ],
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
              headers: {
                [env.authHeaderName]: env.authHeaderValue,
              },
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
      expect(data).toEqual({
        id: expect.any(String),
        name: 'threeve',
        cacheExpiryDate: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        links: [
          {
            name: 'alpha',
            associations: [
              { type: 'Datamuse: means like', score: 42 },
              { type: 'Datamuse: opposite of', score: 13 },
            ],
          },
          {
            name: 'beta',
            associations: [{ type: 'Datamuse: means like' }],
          },
        ],
      });
      expect(data.associations).toBeUndefined();
      expect(getByName).toHaveBeenCalledWith('threeve');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
