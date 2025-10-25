import type { GraphQLResolveInfo } from 'graphql';
import resolvers from './resolvers';
import { createWordController } from './controller';
import type { Context } from './types';
import type { Resolver } from './generated/graphql';

type WordControllerMock = jest.Mocked<ReturnType<typeof createWordController>>;

const mockWordControllerFactory = jest.fn(
  (overrides: Partial<WordControllerMock> = {}): WordControllerMock => ({
    countAll: jest.fn(),
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
  const Query = resolvers.Query!;
  const Mutation = resolvers.Mutation!;

  const ensureResolver = <Result, Parent, Args>(
    resolver: Resolver<Result, Parent, Context, Args> | undefined,
    key: string,
  ): Resolver<Result, Parent, Context, Args> => {
    if (!resolver) {
      throw new Error(`${key} resolver is not implemented`);
    }
    return resolver;
  };

  const callResolver = async <Result, Parent, Args>(
    resolver: Resolver<Result, Parent, Context, Args> | undefined,
    parent: Parent,
    args: Args,
    context: Context,
    key: string,
  ) => {
    const info = {} as GraphQLResolveInfo;
    const resolved = ensureResolver(resolver, key);
    if (typeof resolved === 'function') {
      return resolved(parent, args, context, info);
    }
    return resolved.resolve(parent, args, context, info);
  };

  describe('Queries', () => {
    describe('wordCount: { count, percentage }', () => {
      it('returns total count and percentage out of 500k', async () => {
        const wordController = buildWordController({
          countAll: jest.fn().mockResolvedValue(250000),
        });

        const result = await callResolver(
          Query.wordCount,
          {},
          {},
          buildContext({ wordController }),
          'Query.wordCount',
        );

        expect(wordController.countAll).toHaveBeenCalled();
        expect(result).toEqual({ count: 250000, percentage: 50 });
      });

      it('propagates controller failures', async () => {
        const error = new Error('controller failed');
        const wordController = buildWordController({
          countAll: jest.fn().mockRejectedValue(error),
        });

        await expect(
          callResolver(
            Query.wordCount,
            {},
            {},
            buildContext({ wordController }),
            'Query.wordCount',
          ),
        ).rejects.toThrow('controller failed');

        expect(wordController.countAll).toHaveBeenCalled();
      });
    });

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

        const word = await callResolver(
          Query.word,
          {},
          { name: 'happy' },
          buildContext({ wordController }),
          'Query.word',
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
          callResolver(
            Query.word,
            {},
            { name: 'happy' },
            buildContext({ wordController }),
            'Query.word',
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

        const result = await callResolver(
          Mutation.forceCacheInvalidation,
          {},
          { name: 'test-word' },
          buildContext({ wordController, userId: 'admin-user-123' }),
          'Mutation.forceCacheInvalidation',
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
          callResolver(
            Mutation.forceCacheInvalidation,
            {},
            { name: 'test-word' },
            buildContext({ wordController, userId: 'regular-user' }),
            'Mutation.forceCacheInvalidation',
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
          callResolver(
            Mutation.deleteWord,
            {},
            { name: 'test-word' },
            buildContext({ wordController, userId: 'admin-user-123' }),
            'Mutation.deleteWord',
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
          callResolver(
            Mutation.deleteWord,
            {},
            { name: 'test-word' },
            buildContext({ wordController, userId: 'regular-user' }),
            'Mutation.deleteWord',
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
