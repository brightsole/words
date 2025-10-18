import { GraphQLDateTime, GraphQLJSONObject } from 'graphql-scalars';
import { Context, NameObject, DBWord } from './types';
import { dedupeLinks } from './dedupeLinks';
import { DATAMUSE_CHECK_URL } from './consts';

export default {
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
    word: async (
      _: undefined,
      { name }: NameObject,
      { wordController }: Context,
    ) => wordController.getByName(name),
  },

  Mutation: {
    forceCacheInvalidation: async (
      _: undefined,
      { name }: { name: string },
      { userId, wordController }: Context,
    ) => wordController.invalidateCache(name, userId),

    deleteWord: async (
      _: undefined,
      { name }: NameObject,
      { userId, wordController }: Context,
    ) => wordController.remove(name, userId),
  },

  Word: {
    // for finding out the info of the other items in the system
    __resolveReference: async (
      { name }: NameObject,
      { wordController }: Context,
    ) => wordController.getByName(name),

    links: (word: DBWord) => dedupeLinks(word.associations),
  },

  DateTime: GraphQLDateTime,
  JSONObject: GraphQLJSONObject,
};
