import { gql } from 'graphql-tag';
import getGraphqlServer from '../test/getGraphqlServer';

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

    // Mock fetch for the API calls with some sample association data
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('rel_syn=')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve([
              { word: 'joyful', score: 95 },
              { word: 'cheerful', score: 90 },
            ]),
        });
      }
      if (url.includes('rel_ant=')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve([
              { word: 'sad', score: 85 },
              { word: 'gloomy', score: 80 },
            ]),
        });
      }
      // Return empty for other association types
      return Promise.resolve({
        json: () => Promise.resolve([]),
      });
    });

    const mockAssociations = [
      {
        associationType: 'rel_syn',
        matches: [
          { word: 'joyful', score: 95 },
          { word: 'cheerful', score: 90 },
        ],
      },
      {
        associationType: 'rel_ant',
        matches: [
          { word: 'sad', score: 85 },
          { word: 'gloomy', score: 80 },
        ],
      },
    ];

    const name = 'happy';

    const { body } = await server.executeOperation(
      {
        query: wordQuery,
        variables: {
          name,
        },
      },
      {
        contextValue: {
          Word: {
            get: jest.fn().mockResolvedValue(undefined),
            create: jest.fn().mockResolvedValue({
              name,
              associations: mockAssociations,
              cacheExpiryDate: Date.now() + 24 * 60 * 60 * 1000,
            }),
          },
          event: {},
        },
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
            associations: [{ type: 'rel_syn', score: 95 }],
          },
          {
            name: 'cheerful',
            associations: [{ type: 'rel_syn', score: 90 }],
          },
          {
            name: 'sad',
            associations: [{ type: 'rel_ant', score: 85 }],
          },
          {
            name: 'gloomy',
            associations: [{ type: 'rel_ant', score: 80 }],
          },
        ],
      },
    });
  });
});
