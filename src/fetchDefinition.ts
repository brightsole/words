const fetchWordDefinition = async (word: string) => {
  try {
    const response = await fetch(
      `https://freedictionaryapi.com/api/v1/entries/en/${word}`,
    );
    if (!response.ok) return null;

    const data = await response.json();

    const entry = data?.entries?.[0];

    return {
      definition: entry?.senses?.[0]?.definition || '',
      partOfSpeech: entry?.partOfSpeech || '',
      pronunciation: entry?.pronunciations?.[0]?.text || '',
      source: data?.source?.url || '',
    };
  } catch (error) {
    console.error(`Error fetching definition for ${word}:`, error);
    return null;
  }
};

export default fetchWordDefinition;
