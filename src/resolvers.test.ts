import resolvers from './resolvers';
import fetchDefinition from './fetchDefinition';
import { RiTa } from 'rita';
import { ModelType, Word } from './types';
import { Query as QueryType } from 'dynamoose/dist/ItemRetriever';

jest.mock('./fetchDefinition', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('rita', () => ({
  RiTa: {
    rhymes: jest.fn(),
    soundsLike: jest.fn(),
    spellsLike: jest.fn(),
  },
}));

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
          definition: {
            definition: 'feeling or showing pleasure',
            partOfSpeech: 'adjective',
            pronunciation: '/ˈhæpi/',
            source: 'https://freedictionaryapi.com',
          },
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
      it('creates new word when no cached word exists (with definition + RiTa)', async () => {
        const newWord = {
          name: 'happy',
          associations: [],
          cacheExpiryDate: expect.any(Number),
          definition: {
            definition: 'feeling or showing pleasure',
            partOfSpeech: 'adjective',
            pronunciation: '/ˈhæpi/',
            source: 'https://freedictionaryapi.com',
          },
        };

        const Word = createWordModelMock({
          get: jest.fn().mockResolvedValue(undefined),
          create: jest.fn().mockResolvedValue(newWord),
        });

        // Mock Free Dictionary helper (typed)
        const mockedFetchDefinition = jest.mocked(fetchDefinition);
        mockedFetchDefinition.mockResolvedValue({
          definition: 'feeling or showing pleasure',
          partOfSpeech: 'adjective',
          pronunciation: '/ˈhæpi/',
          source: 'https://freedictionaryapi.com',
        });

        // Mock RiTa methods
        const mockedRiTa = RiTa as jest.Mocked<typeof RiTa>;
        mockedRiTa.rhymes.mockResolvedValue(['sappy']);
        mockedRiTa.soundsLike.mockResolvedValue(['snappy']);
        mockedRiTa.spellsLike.mockResolvedValue(['hoppy']);

        // Mock fetch for Datamuse API calls
        type MinimalResponse = { json: () => Promise<unknown> };
        type MinimalFetch = (input: string) => Promise<MinimalResponse>;
        const mockFetch: jest.Mock<
          ReturnType<MinimalFetch>,
          Parameters<MinimalFetch>
        > = jest.fn().mockResolvedValue({
          json: () => Promise.resolve([]),
        });
        global.fetch = mockFetch as unknown as typeof fetch;

        const word = await Query.word(
          undefined,
          { name: 'happy' },
          { Word, event: {} },
        );

        expect(Word.create).toHaveBeenCalledWith({
          name: 'happy',
          associations: expect.any(Array),
          definition: expect.objectContaining({
            definition: expect.any(String),
          }),
          cacheExpiryDate: expect.any(Number),
        });

        // Verify RiTa-derived associations were included
        const createMock = Word.create as unknown as jest.Mock<
          unknown,
          [
            {
              associations: Array<{
                associationType: string;
                matches: Array<{ word: string; score?: number }>;
              }>;
            },
          ]
        >;
        const createArg = createMock.mock.calls[0][0];
        expect(
          createArg.associations.some(
            (a) =>
              a.associationType === 'RiTa: rhymes' &&
              a.matches.some((m) => m.word === 'sappy'),
          ),
        ).toBe(true);
        expect(
          createArg.associations.some(
            (a) =>
              a.associationType === 'RiTa: sounds like' &&
              a.matches.some((m) => m.word === 'snappy'),
          ),
        ).toBe(true);
        expect(
          createArg.associations.some(
            (a) =>
              a.associationType === 'RiTa: spelled like' &&
              a.matches.some((m) => m.word === 'hoppy'),
          ),
        ).toBe(true);
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
