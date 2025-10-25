import { GraphQLDateTime, GraphQLJSONObject } from 'graphql-scalars';
import type { Resolvers } from './generated/graphql';
import { Context, WordResolverParent } from './types';
import { dedupeLinks } from './dedupeLinks';
import { DATAMUSE_CHECK_URL } from './consts';

const EXPECTED_CORPUS_SIZE = 500_000;

const resolvers: Resolvers = {
  Query: {
    datamuseHealthy: async () => {
      try {
        const response = await fetch(DATAMUSE_CHECK_URL);
        if (!response.ok) throw new Error('Datamuse API is down');
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    word: async (_parent, { name }, { wordController }: Context) =>
      wordController.getByName(name),

    wordCount: async (_parent, _args, { wordController }: Context) => {
      const count = await wordController.countAll();
      return {
        count,
        percentage: (count / EXPECTED_CORPUS_SIZE) * 100,
      };
    },
  },

  Mutation: {
    forceCacheInvalidation: async (
      _parent,
      { name },
      { userId, wordController }: Context,
    ) => wordController.invalidateCache(name, userId),

    deleteWord: async (
      _parent,
      { name },
      { userId, wordController }: Context,
    ) => wordController.remove(name, userId),
  },

  Word: {
    // for finding out the info of the other items in the system
    __resolveReference: async ({ name }, { wordController }: Context) =>
      wordController.getByName(name),

    links: (word: WordResolverParent) => dedupeLinks(word.associations),
  },

  DateTime: GraphQLDateTime,
  JSONObject: GraphQLJSONObject,
};

export default resolvers;
