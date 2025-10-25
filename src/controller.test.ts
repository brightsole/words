import { createWordController, ASSOCIATION_TYPES } from './controller';
import fetchDefinition from './fetchDefinition';
import type { DBWord } from './types';

const envMock = {
  nodeEnv: 'test',
  tableName: 'words-table-test',
  adminUserId: 'test-guy',
  isProduction: false,
  currentWordVersion: 1,
};

jest.mock('./env', () => ({
  __esModule: true,
  default: envMock,
}));

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

type RiTaMock = {
  rhymes: jest.Mock;
  soundsLike: jest.Mock;
  spellsLike: jest.Mock;
};

const mockRiTa = jest.requireMock('rita').RiTa as RiTaMock;

type WordRecord = DBWord & Record<string, unknown>;

type WordDefinition = NonNullable<DBWord['definition']>;

const defaultDefinition: WordDefinition = {
  definition: 'a trial of knowledge',
  partOfSpeech: 'noun',
  pronunciation: '/test/',
  source: 'https://example.com',
};

type WordModelMock = {
  get: jest.Mock<Promise<WordRecord>, [{ name: string }]>;
  create: jest.Mock<Promise<WordRecord>, [WordRecord, { overwrite: boolean }?]>;
  update: jest.Mock;
  delete: jest.Mock;
} & Record<string, unknown>;

const buildWordModel = (): WordModelMock => ({
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const mockedFetchDefinition = fetchDefinition as jest.MockedFunction<
  typeof fetchDefinition
>;

const ASSOCIATION_KEYS = Object.keys(ASSOCIATION_TYPES);
const TWO_YEARS = 2 * 365 * 24 * 60 * 60 * 1000;
const NOW = 1_694_342_400_000;

const buildFetchResponse = (score: number) =>
  Promise.resolve({
    json: async () => [{ word: 'ally', score }],
  } as Response);

describe('createWordController.getByName', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let dateNowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;

    mockedFetchDefinition.mockReset();
    mockRiTa.rhymes.mockReset();
    mockRiTa.soundsLike.mockReset();
    mockRiTa.spellsLike.mockReset();

    envMock.currentWordVersion = 1;
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    global.fetch = originalFetch;
  });

  const primeSuccessfulAggregation = (
    _encodedName: string,
    definition: WordDefinition = defaultDefinition,
    datamuseScore = 99,
  ) => {
    mockedFetchDefinition.mockResolvedValue(definition);
    fetchMock.mockImplementation(() => buildFetchResponse(datamuseScore));

    mockRiTa.rhymes.mockResolvedValue(['best']);
    mockRiTa.soundsLike.mockResolvedValue(['nest']);
    mockRiTa.spellsLike.mockResolvedValue(['tost']);

    return definition;
  };

  const expectSuccessfulWrite = (
    WordModel: WordModelMock,
    {
      encodedName,
      definition,
      expectedFaulty = false,
      expectedVersion = envMock.currentWordVersion,
    }: {
      encodedName: string;
      definition: WordDefinition;
      expectedFaulty?: boolean;
      expectedVersion?: number;
    },
  ) => {
    expect(mockedFetchDefinition).toHaveBeenCalledWith(encodedName);
    expect(fetchMock).toHaveBeenCalledTimes(ASSOCIATION_KEYS.length);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.datamuse.com/words?rel_syn=${encodedName}`,
    );
    expect(mockRiTa.rhymes).toHaveBeenCalledWith(encodedName, { limit: 100 });
    expect(mockRiTa.soundsLike).toHaveBeenCalledWith(encodedName, {
      limit: 100,
    });
    expect(mockRiTa.spellsLike).toHaveBeenCalledWith(encodedName, {
      limit: 100,
    });

    expect(WordModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: encodedName,
        definition,
        faulty: expectedFaulty,
        version: expectedVersion,
        cacheExpiryDate: NOW + TWO_YEARS,
      }),
      { overwrite: true },
    );

    const createdWord = WordModel.create.mock.calls[0][0] as WordRecord;
    expect(createdWord.associations).toHaveLength(ASSOCIATION_KEYS.length + 3);
    expect(createdWord.associations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ associationType: 'Datamuse: means like' }),
        expect.objectContaining({ associationType: 'RiTa: rhymes' }),
        expect.objectContaining({ associationType: 'RiTa: sounds like' }),
        expect.objectContaining({ associationType: 'RiTa: spelled like' }),
      ]),
    );

    return { ...createdWord, cacheMiss: true };
  };

  describe('cache hits', () => {
    it('returns cached word when entry is fresh, non-faulty, and current', async () => {
      const WordModel = buildWordModel();
      const cachedWord: WordRecord = {
        name: 'happy',
        cacheExpiryDate: NOW + 1,
        faulty: false,
        version: envMock.currentWordVersion,
        associations: [],
        definition: null,
        createdAt: NOW,
        updatedAt: NOW,
      };

      WordModel.get.mockResolvedValue(cachedWord);

      // @ts-expect-error test double only implements methods we call
      const controller = createWordController(WordModel);

      const result = await controller.getByName(' Happy ');

      expect(WordModel.get).toHaveBeenCalledWith({ name: 'happy' });
      expect(result).toBe(cachedWord);
      expect(mockedFetchDefinition).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockRiTa.rhymes).not.toHaveBeenCalled();
      expect(mockRiTa.soundsLike).not.toHaveBeenCalled();
      expect(mockRiTa.spellsLike).not.toHaveBeenCalled();
      expect(WordModel.create).not.toHaveBeenCalled();
    });

    it('returns a non-faulty cached word when refresh attempts fail', async () => {
      const WordModel = buildWordModel();
      const encodedName = 'test%20word';
      const cachedWord: WordRecord = {
        name: encodedName,
        cacheExpiryDate: NOW - 1,
        faulty: false,
        version: envMock.currentWordVersion,
        associations: [],
        definition: null,
        createdAt: NOW,
        updatedAt: NOW,
      };

      WordModel.get.mockResolvedValue(cachedWord);
      WordModel.create.mockResolvedValue(cachedWord);

      mockedFetchDefinition.mockResolvedValue(null);

      fetchMock.mockImplementation(() => buildFetchResponse(80));

      mockRiTa.rhymes.mockRejectedValue(new Error('riTa outage'));
      mockRiTa.soundsLike.mockResolvedValue(['guest']);
      mockRiTa.spellsLike.mockResolvedValue(['tess']);

      // @ts-expect-error test double only implements methods we call
      const controller = createWordController(WordModel);

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        const result = await controller.getByName('Test Word');

        expect(mockedFetchDefinition).toHaveBeenCalledWith(encodedName);
        expect(fetchMock).toHaveBeenCalled();
        expect(WordModel.create).not.toHaveBeenCalled();
        expect(result).toBe(cachedWord);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Some association fetches failed',
          expect.objectContaining({ status: 'rejected' }),
        );
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('cache misses (writes)', () => {
    it('writes a new word when no cache entry exists', async () => {
      const WordModel = buildWordModel();
      const encodedName = 'brand%20new';

      WordModel.get.mockRejectedValue(new Error('not found'));
      WordModel.create.mockImplementation(async (doc) => doc);

      const definition = primeSuccessfulAggregation(encodedName);

      // @ts-expect-error test double only implements methods we call
      const controller = createWordController(WordModel);

      const result = await controller.getByName('Brand New');

      expect(WordModel.get).toHaveBeenCalledWith({ name: encodedName });
      const createdWord = expectSuccessfulWrite(WordModel, {
        encodedName,
        definition,
      });

      expect(WordModel.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdWord);
    });

    it('writes a new word when schema version increases', async () => {
      const WordModel = buildWordModel();
      const encodedName = 'test%20word';
      const cachedWord: WordRecord = {
        name: encodedName,
        cacheExpiryDate: NOW + TWO_YEARS,
        faulty: false,
        version: 1,
        associations: [],
        definition: null,
        createdAt: NOW,
        updatedAt: NOW,
      };

      WordModel.get.mockResolvedValue(cachedWord);
      WordModel.create.mockImplementation(async (doc) => doc);

      envMock.currentWordVersion = 3;

      const definition = primeSuccessfulAggregation(encodedName, {
        ...defaultDefinition,
        source: 'https://example.com/version-refresh',
      });

      // @ts-expect-error test double only implements methods we call
      const controller = createWordController(WordModel);

      const result = await controller.getByName('Test Word');

      expect(WordModel.get).toHaveBeenCalledWith({ name: encodedName });
      const createdWord = expectSuccessfulWrite(WordModel, {
        encodedName,
        definition,
        expectedVersion: envMock.currentWordVersion,
      });

      expect(WordModel.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdWord);
      expect(result).not.toBe(cachedWord);
    });

    it('writes a new word when cache entry has expired', async () => {
      const WordModel = buildWordModel();
      const encodedName = 'stale%20word';
      const staleWord: WordRecord = {
        name: encodedName,
        cacheExpiryDate: NOW - 1,
        faulty: false,
        version: envMock.currentWordVersion,
        associations: [],
        definition: null,
        createdAt: NOW,
        updatedAt: NOW,
      };

      WordModel.get.mockResolvedValue(staleWord);
      WordModel.create.mockImplementation(async (doc) => doc);

      const definition = primeSuccessfulAggregation(
        encodedName,
        {
          definition: 'expired entry',
          partOfSpeech: 'noun',
          pronunciation: '/stale/',
          source: 'https://example.com/stale',
        },
        60,
      );

      // @ts-expect-error test double only implements methods we call
      const controller = createWordController(WordModel);

      const result = await controller.getByName('Stale Word');

      const createdWord = expectSuccessfulWrite(WordModel, {
        encodedName,
        definition,
      });

      expect(WordModel.create).toHaveBeenCalledTimes(1);
      expect(result).not.toBe(staleWord);
      expect(result).toEqual(createdWord);
      expect(result.faulty).toBe(false);
    });

    it('writes a new word when cached entry is faulty', async () => {
      const WordModel = buildWordModel();
      const encodedName = 'faulty%20word';
      const faultyCachedWord: WordRecord = {
        name: encodedName,
        cacheExpiryDate: NOW + TWO_YEARS,
        faulty: true,
        version: envMock.currentWordVersion,
        associations: [],
        definition: null,
        createdAt: NOW,
        updatedAt: NOW,
      };

      WordModel.get.mockResolvedValue(faultyCachedWord);
      WordModel.create.mockImplementation(async (doc) => doc);

      const definition = primeSuccessfulAggregation(
        encodedName,
        {
          definition: 'recovered entry',
          partOfSpeech: 'noun',
          pronunciation: '/fresh/',
          source: 'https://example.com/fresh',
        },
        88,
      );

      // @ts-expect-error test double only implements methods we call
      const controller = createWordController(WordModel);

      const result = await controller.getByName('Faulty Word');

      const createdWord = expectSuccessfulWrite(WordModel, {
        encodedName,
        definition,
      });

      expect(WordModel.create).toHaveBeenCalledTimes(1);
      expect(result).not.toBe(faultyCachedWord);
      expect(result).toEqual(createdWord);
      expect(result.faulty).toBe(false);
    });

    it('writes a faulty refresh when no usable cache exists', async () => {
      const WordModel = buildWordModel();
      WordModel.get.mockRejectedValue(new Error('not found'));
      WordModel.create.mockImplementation(async (doc) => doc);

      mockedFetchDefinition.mockResolvedValue(null);
      fetchMock.mockRejectedValue(new Error('datamuse outage'));

      mockRiTa.rhymes.mockRejectedValue(new Error('riTa rhymes fail'));
      mockRiTa.soundsLike.mockRejectedValue(new Error('riTa sounds fail'));
      mockRiTa.spellsLike.mockRejectedValue(new Error('riTa spells fail'));

      // @ts-expect-error test double only implements methods we call
      const controller = createWordController(WordModel);

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      try {
        const result = await controller.getByName('Lonely Word');

        expect(WordModel.create).toHaveBeenCalledWith(
          expect.objectContaining({ faulty: true, associations: [] }),
          { overwrite: true },
        );
        expect(result.faulty).toBe(true);
        expect(result.associations).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalled();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('reuses the cached word on repeat lookups', async () => {
      const WordModel = buildWordModel();
      const encodedName = 'cache%20word';

      WordModel.get.mockRejectedValue(new Error('not found'));
      WordModel.create.mockImplementation(async (doc) => doc);

      primeSuccessfulAggregation(encodedName);

      // @ts-expect-error test double only implements methods we call
      const controller = createWordController(WordModel);

      const firstResult = await controller.getByName('Cache Word');

      expect(firstResult.cacheMiss).toBe(true);
      expect(WordModel.get).toHaveBeenCalledTimes(1);
      expect(mockedFetchDefinition).toHaveBeenCalledWith(encodedName);
      expect(mockedFetchDefinition).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(ASSOCIATION_KEYS.length);
      expect(mockRiTa.rhymes).toHaveBeenCalledTimes(1);
      expect(mockRiTa.soundsLike).toHaveBeenCalledTimes(1);
      expect(mockRiTa.spellsLike).toHaveBeenCalledTimes(1);
      expect(WordModel.create).toHaveBeenCalledTimes(1);
      expect(WordModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: encodedName }),
        { overwrite: true },
      );

      const secondResult = await controller.getByName('Cache Word');

      expect(secondResult.cacheMiss).toBeUndefined();
      expect(secondResult).toBe(WordModel.create.mock.calls[0][0]);
      expect(WordModel.get).toHaveBeenCalledTimes(1);
      expect(mockedFetchDefinition).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(ASSOCIATION_KEYS.length);
      expect(mockRiTa.rhymes).toHaveBeenCalledTimes(1);
      expect(mockRiTa.soundsLike).toHaveBeenCalledTimes(1);
      expect(mockRiTa.spellsLike).toHaveBeenCalledTimes(1);
      expect(WordModel.create).toHaveBeenCalledTimes(1);
    });
  });
});
