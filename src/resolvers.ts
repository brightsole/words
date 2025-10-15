import { GraphQLDateTime, GraphQLJSONObject } from 'graphql-scalars';
import { Context, NameObject, Affirmative, DBWord } from './types';
import { dedupeLinks } from './dedupeLinks';

const DAY = 24 * 60 * 60 * 1000;
const THREE_MONTHS = 90 * DAY;

const ASSOCIATION_TYPES: Record<string, string> = {
  rel_syn: 'means like',
  rel_trg: 'associated with',
  ml: 'means like',
  sl: 'sounds like',
  rel_com: 'comprised with',
  rel_ant: 'opposite of',
  rel_spc: 'is a more specific term',
  rel_gen: 'is a more general term',
  rel_jja: 'popular noun pairings',
  rel_jjb: 'popular adjective pairings',
  rel_par: 'a part of',
  rel_bga: 'commonly followed by',
  rel_bgb: 'commonly preceded by',
  rel_hom: 'homophone of',
};

export default {
  Query: {
    word: async (_: undefined, { name }: NameObject, { Word }: Context) => {
      console.log('resolving word', name);
      try {
        const word = await Word.get({ name });
        if (word && word.cacheExpiryDate > Date.now()) {
          return word;
        }
      } catch (_error) {
        /* not found is fine */
      }

      const associationPromises = Object.keys(ASSOCIATION_TYPES).map(
        async (rel) => {
          const url = `https://api.datamuse.com/words?${rel}=${encodeURIComponent(name)}`;
          const response = await fetch(url);
          const matches = await response.json();

          return {
            associationType: rel,
            matches,
          };
        },
      );

      const results = await Promise.allSettled(associationPromises);

      const associations = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      console.log('fetched from API', associations);

      const newWord = await Word.create({
        name,
        associations,
        cacheExpiryDate: Date.now() + THREE_MONTHS,
      });

      return newWord;
    },
  },

  Mutation: {
    forceCacheInvalidation: async (
      _: undefined,
      { name }: { name: string },
      { userId, Word }: Context,
    ): Promise<Affirmative> => {
      if (userId !== process.env.ADMIN_USER_ID || !process.env.ADMIN_USER_ID) {
        throw new Error('Only admin can force cache invalidation');
      }

      await Word.update(
        { name },
        { cacheExpiryDate: new Date(0).getTime() }, // epoch
        { returnValues: 'ALL_NEW' },
      );
      return { ok: true };
    },

    deleteWord: async (
      _: undefined,
      { name }: NameObject,
      { userId, Word }: Context,
    ): Promise<void> => {
      if (userId !== process.env.ADMIN_USER_ID || !process.env.ADMIN_USER_ID) {
        throw new Error('Only admin can force cache invalidation');
      }

      Word.delete(name);
    },
  },

  Word: {
    // for finding out the info of the other items in the system
    __resolveReference: async ({ name }: NameObject, { Word }: Context) =>
      Word.get(name),

    links: (word: DBWord) => dedupeLinks(word.associations),
  },

  DateTime: GraphQLDateTime,
  JSONObject: GraphQLJSONObject,
};
