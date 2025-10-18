import resolvers from './resolvers';
import { createWordController } from './controller';
import type { Context } from './types';

type WordControllerMock = jest.Mocked<ReturnType<typeof createWordController>>;

const mockWordControllerFactory = jest.fn(
  (overrides: Partial<WordControllerMock> = {}): WordControllerMock => ({
    getByName: jest.fn(),
    invalidateCache: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  }),
);

const buildWordController = (
  overrides: Partial<WordControllerMock> = {},
): WordControllerMock => mockWordControllerFactory(overrides);

type ContextOverrides = Partial<Omit<Context, 'wordController'>> & {
  wordController?: WordControllerMock;
};

const buildContext = (overrides: ContextOverrides = {}): Context => {
  const { wordController = buildWordController(), ...rest } = overrides;

  return {
    event: {},
    wordController,
    ...rest,
  };
};

describe('Resolvers', () => {
  const { Query, Mutation } = resolvers;

  describe('Queries', () => {
    describe('word(name): Word', () => {
      it('delegates to the word controller', async () => {
        const cachedWord = {
          name: 'happy',
          cacheExpiryDate: Date.now() + 1000,
          associations: [],
          definition: {
            definition: 'feeling or showing pleasure',
            partOfSpeech: 'adjective',
            pronunciation: '/ˈhæpi/',
            source: 'https://freedictionaryapi.com',
          },
        };

        const wordController = buildWordController({
          getByName: jest.fn().mockResolvedValue(cachedWord),
        });

        const word = await Query.word(
          undefined,
          { name: 'happy' },
          buildContext({ wordController }),
        );

        expect(wordController.getByName).toHaveBeenCalledWith('happy');
        expect(word).toEqual(cachedWord);
      });

      it('propagates controller failures', async () => {
        const error = new Error('controller failed');
        const wordController = buildWordController({
          getByName: jest.fn().mockRejectedValue(error),
        });

        await expect(
          Query.word(
            undefined,
            { name: 'happy' },
            buildContext({ wordController }),
          ),
        ).rejects.toThrow('controller failed');

        expect(wordController.getByName).toHaveBeenCalledWith('happy');
      });
    });
  });

  describe('Mutations', () => {
    describe('forceCacheInvalidation(name): Affirmative', () => {
      it('invalidates cache when user is admin', async () => {
        const wordController = buildWordController({
          invalidateCache: jest.fn().mockResolvedValue({ ok: true }),
        });

        const result = await Mutation.forceCacheInvalidation(
          undefined,
          { name: 'test-word' },
          buildContext({ wordController, userId: 'admin-user-123' }),
        );

        expect(result).toEqual({ ok: true });
        expect(wordController.invalidateCache).toHaveBeenCalledWith(
          'test-word',
          'admin-user-123',
        );
      });

      it('throws error when user is not admin', async () => {
        const error = new Error('Only admin can force cache invalidation');
        const wordController = buildWordController({
          invalidateCache: jest.fn().mockRejectedValue(error),
        });

        await expect(
          Mutation.forceCacheInvalidation(
            undefined,
            { name: 'test-word' },
            buildContext({ wordController, userId: 'regular-user' }),
          ),
        ).rejects.toThrow('Only admin can force cache invalidation');

        expect(wordController.invalidateCache).toHaveBeenCalledWith(
          'test-word',
          'regular-user',
        );
      });
    });

    describe('deleteWord(name): void', () => {
      it('deletes a word when user is admin', async () => {
        const wordController = buildWordController({
          remove: jest.fn().mockResolvedValue({ ok: true }),
        });

        await expect(
          Mutation.deleteWord(
            undefined,
            { name: 'test-word' },
            buildContext({ wordController, userId: 'admin-user-123' }),
          ),
        ).resolves.toEqual({ ok: true });

        expect(wordController.remove).toHaveBeenCalledWith(
          'test-word',
          'admin-user-123',
        );
      });

      it('throws error when user is not admin', async () => {
        const error = new Error('Only admin can force cache invalidation');
        const wordController = buildWordController({
          remove: jest.fn().mockRejectedValue(error),
        });

        await expect(
          Mutation.deleteWord(
            undefined,
            { name: 'test-word' },
            buildContext({ wordController, userId: 'regular-user' }),
          ),
        ).rejects.toThrow('Only admin can force cache invalidation');

        expect(wordController.remove).toHaveBeenCalledWith(
          'test-word',
          'regular-user',
        );
      });
    });
  });
});
