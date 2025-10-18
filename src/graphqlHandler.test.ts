import { gql } from 'graphql-tag';
import { RiTa } from 'rita';
import getGraphqlServer from '../test/getGraphqlServer';
import { createWordController } from './controller';
import fetchDefinition from './fetchDefinition';
import type { Context, Word, ModelType } from './types';
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

const fetchMock = jest.spyOn(global, 'fetch');
const fetchDefinitionMock = jest.mocked(fetchDefinition);
const riTaMock = jest.mocked(RiTa);

afterEach(() => {
  fetchMock.mockReset();
  fetchDefinitionMock.mockReset();
  riTaMock.rhymes.mockReset();
  riTaMock.soundsLike.mockReset();
  riTaMock.spellsLike.mockReset();
});

type ModelMock = jest.Mocked<ModelType & QueryType<Word>>;

const createWordModel = () =>
  ({
    get: jest.fn().mockReturnThis(),
    create: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  }) as unknown as ModelMock;

// INTEGRATION TEST OF THE FULL PATH
// only test for completion of high level access
// correct low level unit testing should be done on the resolver/util level

describe('Resolver full path', () => {
  it('queries a word without error', async () => {
    const server = getGraphqlServer();

    const wordQuery = gql`
      query GetWord($name: ID!) {
        word(name: $name) {
          name
          cacheExpiryDate
          links {
            name
            associations {
              type
              score
            }
          }
        }
      }
    `;

    const datamuseResponses: Record<
      string,
      Array<{ word: string; score: number }>
    > = {
      rel_syn: [
        { word: 'joyful', score: 95 },
        { word: 'cheerful', score: 90 },
      ],
      rel_ant: [
        { word: 'sad', score: 85 },
        { word: 'gloomy', score: 80 },
      ],
    };

    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      const key = Object.keys(datamuseResponses).find((rel) =>
        url.includes(`${rel}=`),
      );

      const payload = key ? datamuseResponses[key] : [];
      return new Response(JSON.stringify(payload));
    });

    fetchDefinitionMock.mockResolvedValue({
      definition: 'feeling or showing pleasure',
      partOfSpeech: 'adjective',
      pronunciation: '/ˈhæpi/',
      source: 'https://freedictionaryapi.com',
    });

    riTaMock.rhymes.mockResolvedValue([]);
    riTaMock.soundsLike.mockResolvedValue([]);
    riTaMock.spellsLike.mockResolvedValue([]);

    const timestamp = new Date();

    const wordModel = createWordModel();

    wordModel.get.mockResolvedValue(null as never);
    wordModel.create.mockImplementation(
      async (word: Partial<Word>): Promise<Word> =>
        ({
          ...word,
          updatedAt: new Date(timestamp).getTime(),
          createdAt: new Date(timestamp).getTime(),
          cacheExpiryDate:
            Date.now() + 1000 * 60 * 60 * 24 * 7 /* 7 days from now */,
        }) as Word,
    );

    const wordController = createWordController(wordModel);

    const context: Context = {
      wordController,
      event: {},
    };

    const name = 'happy';

    const { body } = await server.executeOperation(
      {
        query: wordQuery,
        variables: {
          name,
        },
      },
      {
        contextValue: context,
      },
    );

    if (body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response');
    }

    const { singleResult } = body;

    expect(singleResult.errors).toBeUndefined();
    expect(singleResult.data).toEqual({
      word: {
        name,
        cacheExpiryDate: expect.any(Date),
        links: [
          {
            name: 'joyful',
            associations: [{ type: 'Datamuse: means like', score: 95 }],
          },
          {
            name: 'cheerful',
            associations: [{ type: 'Datamuse: means like', score: 90 }],
          },
          {
            name: 'sad',
            associations: [{ type: 'Datamuse: opposite of', score: 85 }],
          },
          {
            name: 'gloomy',
            associations: [{ type: 'Datamuse: opposite of', score: 80 }],
          },
        ],
      },
    });

    expect(wordModel.get).toHaveBeenCalledWith({ name });
    expect(wordModel.create).toHaveBeenCalledTimes(1);
    expect(wordModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name,
        associations: expect.any(Array),
        definition: expect.objectContaining({ definition: expect.any(String) }),
      }),
      { overwrite: true },
    );
  });
});
