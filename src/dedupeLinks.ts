import { DBWord, GQLLink } from './types';

/**
 * Transforms database associations into deduplicated GraphQL links format.
 * Takes associations from the database (grouped by association type) and
 * transforms them into links (grouped by word) with no duplications.
 */
export const dedupeLinks = (
  associations: NonNullable<DBWord['associations']> = [],
): GQLLink[] => {
  const wordMap = new Map<string, GQLLink['associations']>();

  // Group all associations by word, collecting all their types and scores
  associations.forEach(({ associationType, matches }) => {
    matches.forEach(({ word, score }) => {
      if (!wordMap.has(word)) {
        wordMap.set(word, []);
      }

      wordMap.get(word)!.push({
        type: associationType,
        ...(typeof score === 'number' && { score }),
      });
    });
  });

  // Transform the map into the GraphQL format
  return Array.from(wordMap.entries()).map(([name, associations]) => ({
    name,
    associations,
  }));
};
