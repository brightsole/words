import resolvers from './resolvers';
import { ModelType, Word } from './types';
import { Query as QueryType } from 'dynamoose/dist/ItemRetriever';

const { Query, Mutation } = resolvers;

type WordModelMock = jest.Mocked<ModelType & QueryType<Word>>;

const createWordModelMock = (
  overrides: Partial<WordModelMock> = {},
): WordModelMock => {
  return {
    get: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    using: jest.fn().mockReturnThis(),
    exec: jest.fn().mockReturnThis(),
    create: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    ...overrides,
  } as WordModelMock; // the word is partial, which spooks ts
};

describe('Resolvers', () => {
  describe('Queries', () => {
    describe('word(name): Word', () => {
      it('fetches a cached word when cache is valid', async () => {
        const cachedWord = {
          name: 'happy',
          cacheExpiryDate: Date.now() + 1000,
          associations: [],
        };
        const Word = createWordModelMock({
          get: jest.fn().mockResolvedValue(cachedWord),
        });

        const word = await Query.word(
          undefined,
          { name: 'happy' },
          { Word, event: {} },
        );
        expect(word).toEqual(cachedWord);
      });

      it('creates new word when no cached word exists', async () => {
        const newWord = {
          name: 'happy',
          associations: [],
          cacheExpiryDate: expect.any(Number),
        };

        const Word = createWordModelMock({
          get: jest.fn().mockResolvedValue(undefined),
          create: jest.fn().mockResolvedValue(newWord),
        });

        // Mock fetch for API calls
        global.fetch = jest.fn().mockResolvedValue({
          json: () => Promise.resolve([]),
        });

        const word = await Query.word(
          undefined,
          { name: 'happy' },
          { Word, event: {} },
        );

        expect(Word.create).toHaveBeenCalledWith({
          name: 'happy',
          associations: expect.any(Array),
          cacheExpiryDate: expect.any(Number),
        });
        expect(word).toEqual(newWord);
      });
    });
  });

  describe('Mutations', () => {
    describe('forceCacheInvalidation(name): Affirmative', () => {
      beforeEach(() => {
        process.env.ADMIN_USER_ID = 'admin-user-123';
      });

      afterEach(() => {
        delete process.env.ADMIN_USER_ID;
      });

      it('invalidates cache when user is admin', async () => {
        const Word = createWordModelMock({
          update: jest.fn().mockResolvedValue({ ok: true }),
        });

        const result = await Mutation.forceCacheInvalidation(
          undefined,
          { name: 'test-word' },
          { Word, event: {}, userId: 'admin-user-123' },
        );

        expect(result).toEqual({ ok: true });
        expect(Word.update).toHaveBeenCalledWith(
          { name: 'test-word' },
          { cacheExpiryDate: expect.any(Number) },
          { returnValues: 'ALL_NEW' },
        );
      });

      it('throws error when user is not admin', async () => {
        const Word = createWordModelMock({
          update: jest.fn(),
        });

        await expect(
          Mutation.forceCacheInvalidation(
            undefined,
            { name: 'test-word' },
            { Word, event: {}, userId: 'regular-user' },
          ),
        ).rejects.toThrow('Only admin can force cache invalidation');
      });
    });

    describe('deleteWord(name): void', () => {
      beforeEach(() => {
        process.env.ADMIN_USER_ID = 'admin-user-123';
      });

      afterEach(() => {
        delete process.env.ADMIN_USER_ID;
      });

      it('deletes a word when user is admin', async () => {
        const Word = createWordModelMock({
          delete: jest.fn().mockResolvedValue(undefined),
        });

        await expect(
          Mutation.deleteWord(
            undefined,
            { name: 'test-word' },
            { Word, event: {}, userId: 'admin-user-123' },
          ),
        ).resolves.toBeUndefined();

        expect(Word.delete).toHaveBeenCalledWith('test-word');
      });

      it('throws error when user is not admin', async () => {
        const Word = createWordModelMock({
          delete: jest.fn(),
        });

        await expect(
          Mutation.deleteWord(
            undefined,
            { name: 'test-word' },
            { Word, event: {}, userId: 'regular-user' },
          ),
        ).rejects.toThrow('Only admin can force cache invalidation');
      });
    });
  });
});
