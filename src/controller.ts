import { model } from 'dynamoose';
import { RiTa } from 'rita';
import type { Word, ModelType } from './types';
import WordSchema from './Word.schema';
import env from './env';
import fetchDefinition from './fetchDefinition';

const DAY = 24 * 60 * 60 * 1000;
const THREE_MONTHS = 90 * DAY;

export const ASSOCIATION_TYPES: Record<string, string> = {
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

export const createWordController = (WordModel: ModelType) => ({
  getByName: async (rawName: string) => {
    const name = encodeURIComponent(rawName.trim().toLowerCase());

    const foundWord = await WordModel.get({ name }).catch(() => null);
    if (
      foundWord &&
      foundWord.cacheExpiryDate > Date.now() &&
      !foundWord.faulty &&
      foundWord.version >= env.currentWordVersion
    ) {
      return foundWord;
    }

    // Fetch definition from Free Dictionary API
    const definition = await fetchDefinition(name);

    let faulty = false;
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
      .map((result) => result.value)
      .filter((assoc) => assoc.matches.length > 0);

    results
      .filter((result) => result.status === 'rejected')
      .forEach((failure) => {
        faulty = true;
        console.error('Some association fetches failed', failure);
      });

    // don't overwrite a non-faulty entry with a faulty one
    if (foundWord && !foundWord.faulty && faulty) return foundWord;

    const newWord = await WordModel.create(
      {
        name,
        faulty,
        associations,
        definition: definition,
        version: env.currentWordVersion,
        cacheExpiryDate: Date.now() + THREE_MONTHS,
      },
      { overwrite: true }, // upsert
    );

    return { ...newWord, cacheMiss: true };
  },

  invalidateCache: async (name: string, userId?: string) => {
    if (userId !== env.adminUserId || !env.adminUserId) {
      throw new Error('Only admin can force cache invalidation');
    }

    await WordModel.update(
      { name },
      { cacheExpiryDate: new Date(0).getTime() }, // epoch
      { returnValues: 'ALL_NEW' },
    );
    return { ok: true };
  },

  remove: async (name: string, userId?: string) => {
    if (userId !== env.adminUserId || !env.adminUserId) {
      throw new Error('Only admin can force cache invalidation');
    }

    await WordModel.delete(name);
    return { ok: true };
  },
});

export const startController = () => {
  const wordModel = model<Word>(env.tableName, WordSchema);

  return createWordController(wordModel);
};
