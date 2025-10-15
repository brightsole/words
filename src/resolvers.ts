import { GraphQLDateTime, GraphQLJSONObject } from 'graphql-scalars';
import { RiTa } from 'rita';
import { Context, NameObject, Affirmative, DBWord } from './types';
import { dedupeLinks } from './dedupeLinks';
import fetchDefinition from './fetchDefinition';

const DAY = 24 * 60 * 60 * 1000;
const THREE_MONTHS = 90 * DAY;

const ASSOCIATION_TYPES: Record<string, string> = {
  rel_syn: 'Datamuse: means like',
  rel_trg: 'Datamuse: associated with',
  ml: 'Datamuse: means like',
  sl: 'Datamuse: sounds like',
  rel_com: 'Datamuse: comprised with',
  rel_ant: 'Datamuse: opposite of',
  rel_spc: 'Datamuse: is a more specific term',
  rel_gen: 'Datamuse: is a more general term',
  rel_jja: 'Datamuse: popular noun pairings',
  rel_jjb: 'Datamuse: popular adjective pairings',
  rel_par: 'Datamuse: a part of',
  rel_bga: 'Datamuse: commonly followed by',
  rel_bgb: 'Datamuse: commonly preceded by',
  rel_hom: 'Datamuse: homophone of',
};

export default {
  Query: {
    word: async (
      _: undefined,
      { name: rawName }: NameObject,
      { Word }: Context,
    ) => {
      const name = encodeURIComponent(rawName.trim().toLowerCase());
      try {
        const word = await Word.get({ name });
        if (word && word.cacheExpiryDate > Date.now()) {
          return word;
        }
      } catch {
        /* not found is fine */
      }

      // Fetch definition from Free Dictionary API
      const definition = await fetchDefinition(name);

      const associationPromises = Object.keys(ASSOCIATION_TYPES).map(
        async (rel) => {
          const url = `https://api.datamuse.com/words?${rel}=${name}`;
          const response = await fetch(url);
          const matches = await response.json();

          return {
            associationType: ASSOCIATION_TYPES[rel],
            matches,
          };
        },
      );
      const ritaRhymes = RiTa.rhymes(name, { limit: 100 }).then((rhymes) => ({
        associationType: 'RiTa: rhymes',
        matches: rhymes.map((word) => ({ word })),
      }));
      const ritaSoundsLike = RiTa.soundsLike(name, { limit: 100 }).then(
        (rhymes) => ({
          associationType: 'RiTa: sounds like',
          matches: rhymes.map((word) => ({ word })),
        }),
      );
      const ritaSpelledLike = RiTa.spellsLike(name, { limit: 100 }).then(
        (rhymes) => ({
          associationType: 'RiTa: spelled like',
          matches: rhymes.map((word) => ({ word })),
        }),
      );

      const results = await Promise.allSettled([
        ...associationPromises,
        ritaSpelledLike,
        ritaSoundsLike,
        ritaRhymes,
      ]);

      const associations = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      results
        .filter((result) => result.status === 'rejected')
        .forEach((failure) =>
          console.error('Some association fetches failed', failure),
        );

      const newWord = await Word.create({
        name,
        associations,
        definition: definition,
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
